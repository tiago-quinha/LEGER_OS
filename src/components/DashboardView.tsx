"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Area, AreaChart, ReferenceLine, CartesianGrid } from "recharts"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight, Banknote, ChevronLeft, CalendarDays, ChevronRight, Landmark, Target, AlertTriangle, CheckCircle2, Zap, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { NumberTicker } from "@/components/ui/number-ticker"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { useSystem } from "@/lib/SystemContext"

import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { AnimatedList } from "@/components/unlumen-ui/animated-list"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { FloatingTooltipTrigger } from "@/components/unlumen-ui/floating-tooltip"
import { JarvisIntelligence } from "@/components/JarvisIntelligence"

interface DashboardViewProps {
  expenses: any[]
  categories: any[]
  budgets: any[]
  balances: any[]
  cycles: any[]
  currentCycleId: string
  injectedStartBalance: number
  previousExpenses: any[]
  previousStartBalance: number
}

export function DashboardView({ expenses, categories, budgets, balances, cycles, currentCycleId, injectedStartBalance, previousExpenses, previousStartBalance }: DashboardViewProps) {
  const router = useRouter()
  const { setAuditPanelOpen, setActiveTransactionId } = useSystem()
  
  const currentCycle = cycles.find(c => c.id === currentCycleId) || cycles[0]

  // DATA CALCULATIONS
  const totalOut = expenses
    .filter(exp => parseFloat(exp.amount.toString()) < 0)
    .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount.toString()) || 0), 0)

  const totalIn = expenses
    .filter(exp => parseFloat(exp.amount.toString()) > 0)
    .reduce((sum, exp) => sum + (parseFloat(exp.amount.toString()) || 0), 0)

  const netChange = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
  const cycleEndBalance = injectedStartBalance + netChange

  // PROJECTION & CYCLE PROGRESS
  const startDate = new Date(currentCycle.startDate)
  const today = new Date()
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / 86400000))
  const totalDaysInCycle = 30
  const dailyAvg = totalOut / daysElapsed
  const projectedTotalOut = totalOut + (dailyAvg * Math.max(0, totalDaysInCycle - daysElapsed))
  const onTrack = totalIn > 0 ? projectedTotalOut <= totalIn : true

  const currentIndex = cycles.findIndex(c => c.id === currentCycleId)

  // Velocity Calculation
  const timeProgress = Math.min(1, daysElapsed / totalDaysInCycle)
  const spendProgress = totalIn > 0 ? totalOut / totalIn : 0
  const velocity = timeProgress > 0 ? spendProgress / timeProgress : 0
  const estimatedFinalBalance = injectedStartBalance + totalIn - projectedTotalOut

  const navigateCycle = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (cycles[nextIndex]) router.push(`/?cycleId=${cycles[nextIndex].id}`)
  }

  const openAudit = (id: string) => {
    setActiveTransactionId(id)
    setAuditPanelOpen(true)
  }

  const [activeTab, setActiveTab] = useState<'burn' | 'liquidity'>('liquidity')
  const [viewMode, setViewMode] = useState<'graph' | 'calendar'>('graph')

  // Group expenses by date for calendar view
  const expensesByDate = expenses.reduce((acc: any, exp) => {
    const date = new Date(exp.date).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(exp)
    return acc
  }, {})

  // GENERATE HYBRID DATA
  const hybridData = Array.from({ length: totalDaysInCycle + 1 }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

    let actualSpend: number | null = null
    let actualBalance: number | null = null
    if (date <= today) {
        const dateEnd = new Date(date)
        dateEnd.setHours(23, 59, 59, 999)

        actualSpend = expenses
            .filter(e => new Date(e.date) <= dateEnd && parseFloat(e.amount) < 0)
            .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0)
        
        actualBalance = injectedStartBalance + expenses
            .filter(e => new Date(e.date) <= dateEnd)
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    }

    const theoretical = (totalIn / totalDaysInCycle) * i
    
    let projectionSpend = null
    let projectionBalance = null
    if (date > today) {
        const lastActualSpend = expenses
            .filter(e => new Date(e.date) <= today && parseFloat(e.amount) < 0)
            .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0)
        const lastActualBalance = injectedStartBalance + expenses
            .filter(e => new Date(e.date) <= today)
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
            
        projectionSpend = lastActualSpend + (dailyAvg * (i - daysElapsed))
        projectionBalance = lastActualBalance - (dailyAvg * (i - daysElapsed))
    }

    return {
      day: i,
      dateLabel,
      actualSpend,
      actualBalance,
      theoretical,
      projectionSpend,
      projectionBalance
    }
  })

  const spendingByCategory = categories.map(cat => {
    const spent = expenses
      .filter(exp => exp.category_id === cat.id && parseFloat(exp.amount) < 0)
      .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)
    
    // Find budget for this category
    const budget = budgets.find(b => b.category_id?.toString() === cat.id.toString())
    const limit = budget ? parseFloat(budget.amount) : 0

    // Previous spend simulation
    const prevSpentAtPoint = previousExpenses
        .filter(e => e.category_id === cat.id && parseFloat(e.amount) < 0)
        .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)
    
    return { 
        name: cat.name, 
        value: spent, 
        limit, 
        color: cat.color || "#09090B",
        prevValue: prevSpentAtPoint 
    }
  }).filter(c => c.value > 0 || c.limit > 0).sort((a, b) => b.value - a.value)

  const activeBudgets = spendingByCategory.filter(c => c.limit > 0)

  return (
    <div className="mx-auto max-w-5xl space-y-10 md:space-y-16 w-full">
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="absolute top-0 right-0 technical-label opacity-20 hidden lg:block uppercase tracking-widest text-[9px]">
          REF_ID: {currentCycle.id.padStart(6, '0')} // MAIN_NODE
        </div>
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Landmark className="h-3 w-3" />
            <span>Financial Statement</span>
            <span className="opacity-30">/</span>
            <span>{currentCycle.id.padStart(3, '0')}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase leading-none break-words">
            {currentCycle.label.replace('Cycle: ', '')}
          </h1>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto">
          {/* Velocity Meter */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
             <FloatingTooltipTrigger content="Spend velocity ratio" description="A value > 1.1 means spending is faster than time progress in this cycle.">
               <span className="technical-label text-[8px] md:text-[9px] cursor-help border-b border-dotted border-muted-foreground/50">Cycle Velocity</span>
             </FloatingTooltipTrigger>
             <div className="flex items-center gap-3">
                <div className="w-24 md:w-32 h-1 bg-secondary relative overflow-hidden ledger-border">
                    <div className={cn("h-full transition-all duration-1000", velocity > 1.1 ? "bg-destructive" : "bg-foreground")} style={{ width: `${Math.min(100, velocity * 50)}%` }} />
                </div>
                <Zap className={cn("h-3 w-3 md:h-3.5 md:w-3.5", velocity > 1.1 ? "text-destructive" : "text-foreground")} />
             </div>
          </div>

          <div className="flex border border-border ledger-border bg-white overflow-hidden">
            <MagneticButton variant="ghost" size="icon" onClick={() => navigateCycle('prev')} disabled={currentIndex >= cycles.length - 1} className="h-10 w-10 md:h-12 md:w-12 border-r border-border rounded-none hover:bg-secondary flex items-center justify-center" strength={0.35}>
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </MagneticButton>
            <MagneticButton variant="ghost" size="icon" onClick={() => navigateCycle('next')} disabled={currentIndex <= 0} className="h-10 w-10 md:h-12 md:w-12 rounded-none hover:bg-secondary flex items-center justify-center" strength={0.35}>
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </MagneticButton>
          </div>
        </div>
      </header>

      {/* 2. Trajectories */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <div className="flex items-center border border-border ledger-border bg-white overflow-hidden shrink-0">
              <button 
                onClick={() => setActiveTab('liquidity')}
                className={cn(
                  "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-mono uppercase tracking-widest transition-all",
                  activeTab === 'liquidity' ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                Liquidity
              </button>
              <button 
                onClick={() => setActiveTab('burn')}
                className={cn(
                  "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-mono uppercase tracking-widest transition-all border-l border-border",
                  activeTab === 'burn' ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                Burn
              </button>
            </div>

            <div className="flex items-center border border-border ledger-border bg-white overflow-hidden shrink-0">
              <button 
                onClick={() => setViewMode('graph')}
                className={cn(
                  "px-4 py-2 transition-all",
                  viewMode === 'graph' ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "px-4 py-2 transition-all border-l border-border",
                  viewMode === 'calendar' ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-4 text-[9px] md:text-[10px] font-mono w-full sm:w-auto">
             <div className="technical-label opacity-40 hidden lg:block uppercase tracking-tighter">
                ACTIVE_BUFFER // SYNC: 100%
             </div>
             <div className="flex items-center justify-center grow sm:grow-0">
                {activeTab === 'burn' ? (
                  <GlowingBadge variant={onTrack ? "success" : "error"} pulse dot className="px-4 py-2 border-border/40">
                    {onTrack ? "STATUS: OPTIMAL" : "STATUS: CRITICAL"}
                  </GlowingBadge>
                ) : (
                  <GlowingBadge variant={cycleEndBalance >= injectedStartBalance ? "success" : "error"} pulse dot className="px-4 py-2 border-border/40">
                    <span>DELTA: <PrivacyValue><NumberTicker value={Math.abs(cycleEndBalance - injectedStartBalance)} prefix={cycleEndBalance >= injectedStartBalance ? "+" : "-€"} /></PrivacyValue></span>
                  </GlowingBadge>
                )}
             </div>
          </div>
        </div>
        
        <div className="min-h-[300px] md:min-h-[400px] h-fit w-full border border-border ledger-border p-4 md:p-10 bg-white/40 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-4 left-4 technical-label opacity-10 uppercase tracking-widest font-mono text-[8px] md:text-[9px]">TS_QUANT_V4 // {viewMode === 'graph' ? 'REALTIME_PLOTTING' : 'TEMPORAL_AUDIT'}</div>
          
          {viewMode === 'graph' ? (
            <div className="h-[280px] md:h-[320px] w-full mt-4 md:mt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hybridData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} interval={window?.innerWidth < 768 ? 10 : 5} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} tickFormatter={(val) => `€${Math.round(val)}`} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white border border-foreground p-2 md:p-3 font-mono text-[9px] md:text-[10px] space-y-1.5 md:space-y-2 shadow-sm z-50">
                            <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
                            <div className="space-y-1">
                              <p className="flex justify-between gap-6 md:gap-8 uppercase"><span>Position:</span> <span>€{(data.actualBalance ?? data.projectionBalance)?.toFixed(2)}</span></p>
                              {data.actualSpend !== null && <p className="flex justify-between gap-6 md:gap-8 opacity-60 uppercase"><span>Burn:</span> <span>€{data.actualSpend.toFixed(2)}</span></p>}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: '#09090B', strokeWidth: 1 }}
                  />
                  <Area type="stepAfter" dataKey={activeTab === 'liquidity' ? "actualBalance" : "actualSpend"} stroke="#09090B" strokeWidth={2} fill="#09090B05" name="Active" isAnimationActive={false} />
                  <Area type="monotone" dataKey={activeTab === 'liquidity' ? "projectionBalance" : "projectionSpend"} stroke="#09090B88" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" name="Projection" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto mt-6">
              <div className="min-w-[600px] grid grid-cols-7 border-t border-l border-border ledger-border bg-white/20">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-2 border-r border-b border-border technical-label text-center bg-secondary/20 font-bold text-[9px]">{day}</div>
                ))}
                {Array.from({ length: totalDaysInCycle + 1 }, (_, i) => {
                  const date = new Date(startDate)
                  date.setDate(date.getDate() + i)
                  const dateStr = date.toDateString()
                  const dayExpenses = expensesByDate[dateStr] || []
                  const dayOut = dayExpenses.filter((e: any) => parseFloat(e.amount) < 0).reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
                  const dayIn = dayExpenses.filter((e: any) => parseFloat(e.amount) > 0).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)
                  const netDay = dayIn - dayOut
                  
                  // Handle offset for first day of cycle
                  const isFirst = i === 0
                  const dayOfWeek = date.getDay() // 0-6 (Sun-Sat)
                  const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0-6 (Mon-Sun)
                  
                  const cells = []
                  if (isFirst) {
                      for (let j = 0; j < adjustedDayOfWeek; j++) {
                          cells.push(<div key={`empty-${j}`} className="border-r border-b border-border bg-secondary/5 h-20 md:h-24" />)
                      }
                  }

                  cells.push(
                      <div key={i} className={cn(
                          "border-r border-b border-border h-20 md:h-24 p-2 relative group hover:bg-secondary/30 transition-all duration-500", 
                          date.toDateString() === today.toDateString() ? "bg-foreground/5 shadow-inner" : "bg-white/40",
                          netDay > 0 && "bg-emerald-500/[0.03] shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]",
                          netDay < 0 && "bg-destructive/[0.03] shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
                      )}>
                          {netDay !== 0 && (
                              <div className={cn(
                                  "absolute top-0 left-0 w-full h-0.5 opacity-40",
                                  netDay > 0 ? "bg-emerald-500" : "bg-destructive"
                              )} />
                          )}
                          <span className="text-[9px] md:text-[10px] font-mono text-muted-foreground">{date.getUTCDate()}</span>
                          {dayExpenses.length > 0 && (
                              <div className="mt-1 space-y-0.5 md:space-y-1">
                                  {dayIn > 0 && (
                                      <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-emerald-500 rounded-none" />
                                          <span className="text-[7px] md:text-[8px] font-mono font-bold text-emerald-600">
                                              <PrivacyValue>+€{dayIn.toFixed(0)}</PrivacyValue>
                                          </span>
                                      </div>
                                  )}
                                  {dayOut > 0 && (
                                      <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-destructive rounded-none" />
                                          <span className="text-[7px] md:text-[8px] font-mono font-bold">
                                              <PrivacyValue>-€{dayOut.toFixed(0)}</PrivacyValue>
                                          </span>
                                      </div>
                                  )}
                              </div>
                          )}
                          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[7px] font-mono text-muted-foreground uppercase">{dayExpenses.length} TX</span>
                          </div>
                      </div>
                  )
                  return cells
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0 border border-border ledger-border divide-y sm:divide-y-0 sm:divide-x md:divide-x divide-border bg-white overflow-hidden">
        {[
          { 
            label: "01 / LIQUIDITY POSITION", 
            value: cycleEndBalance, 
            delta: cycleEndBalance - injectedStartBalance, 
            sub: `PROJ: €${estimatedFinalBalance.toFixed(2)}`,
            tooltip: "Fluid Position Value",
            tooltipDesc: "Aggregated balance of all active accounts sync'ed up to the end of the current cycle, reflecting all inputs."
          },
          { 
            label: "02 / TOTAL INFLOW", 
            value: totalIn, 
            sub: "REVENUE & EXTERNAL TRANSFERS", 
            color: "text-emerald-600",
            tooltip: "Total Inflow Volume",
            tooltipDesc: "All positive transactions parsed in the current paycheck cycle, including payroll and incoming transfers."
          },
          { 
            label: "03 / TOTAL OUTFLOW", 
            value: totalOut, 
            sub: `${((totalOut/(totalIn || 1))*100 || 0).toFixed(1)}% CONSUMED`,
            tooltip: "Total Burn Amount",
            tooltipDesc: "Total value of all parsed debit transactions, expenses, and system cash outflows in this cycle."
          }
        ].map((metric, idx) => (
          <Tilt 
            key={idx} 
            rotationFactor={8}
            className={cn("p-6 md:p-8 space-y-3 md:space-y-4 bg-white/10 dark:bg-card/40 hover:bg-secondary/35 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between", idx === 2 && "sm:col-span-2 md:col-span-1")}
          >
            <div className="flex items-center justify-between z-10">
              <FloatingTooltipTrigger content={metric.tooltip} description={metric.tooltipDesc}>
                <span className="technical-label text-[8px] md:text-[9px] cursor-help border-b border-dotted border-muted-foreground/30">{metric.label}</span>
              </FloatingTooltipTrigger>
              {metric.sub && !metric.sub.includes('%') && <span className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter hidden sm:inline">{metric.sub}</span>}
            </div>
            <div className={cn("text-4xl md:text-5xl font-mono font-bold tracking-tighter z-10", metric.color)}>
              <PrivacyValue>
                <NumberTicker value={metric.value} prefix="€" />
              </PrivacyValue>
            </div>
            <div className="z-10">
              {metric.delta !== undefined ? (
                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-mono">
                  <span className="text-muted-foreground">vs START:</span>
                  <span className={cn(metric.delta >= 0 ? "text-emerald-600" : "text-destructive")}>
                    <PrivacyValue>
                      <NumberTicker value={Math.abs(metric.delta)} prefix={metric.delta >= 0 ? "+" : "-€"} />
                    </PrivacyValue>
                  </span>
                </div>
              ) : metric.sub.includes('%') ? (
                <div className="w-full h-1 bg-secondary ledger-border mt-2">
                  <div className="h-full bg-foreground" style={{ width: Math.min(100, parseFloat(metric.sub.split('%')[0])) + '%' }} />
                </div>
              ) : <div className="h-4" />}
            </div>
            <ClippedCircle circleClassName="bg-white/15 dark:bg-zinc-800/30" circleSize={400} />
          </Tilt>
        ))}
      </div>

      {/* AI Strategy Insights */}
      <section className="space-y-6">
        <JarvisIntelligence 
          cycleData={{
            currentBalance: cycleEndBalance,
            velocity,
            categories: spendingByCategory.filter(c => c.value > 0)
          }} 
        />
      </section>

      {/* 4. Budgets */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <h2 className="technical-label">Budget Performance // CONSTRAINT_MATRIX</h2>
          <span className="text-[10px] font-mono text-muted-foreground">{activeBudgets.length} ACTIVE LIMITS</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {activeBudgets.map((cat) => {
            const percentage = (cat.value / cat.limit) * 100
            const isOver = cat.value > cat.limit
            return (
              <div key={cat.name} className="space-y-3 group cursor-pointer" onClick={() => router.push('/budgets')}>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight group-hover:text-foreground transition-colors">{cat.name}</p>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">
                      {isOver ? "THRESHOLD EXCEEDED" : `€${(cat.limit - cat.value).toFixed(2)} REMAINING`}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-mono font-bold">
                      <PrivacyValue><NumberTicker value={cat.value} prefix="€" /></PrivacyValue> 
                      <span className="text-muted-foreground font-normal opacity-40"> / €{cat.limit.toFixed(2)}</span>
                    </div>
                    <p className={cn("text-[9px] font-mono font-bold uppercase tracking-tighter", isOver ? "text-destructive" : "text-emerald-600")}>
                      {percentage.toFixed(1)}% Load
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-secondary overflow-hidden ledger-border">
                  <div 
                    className={cn("h-full transition-all duration-1000", isOver ? "bg-destructive" : "bg-foreground")} 
                    style={{ width: `${Math.min(100, percentage)}%` }} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 pb-20">
        <div className="space-y-8">
          <h3 className="technical-label border-b border-border pb-4 uppercase">Classification Log</h3>
          <div className="space-y-6">
            {spendingByCategory.map((cat) => (
              <div key={cat.name} className="group cursor-default">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold uppercase tracking-tight group-hover:pl-2 transition-all duration-300 block">{cat.name}</span>
                  <span className="text-xs font-mono font-bold uppercase">€{cat.value.toFixed(2)}</span>
                </div>
                <div className="h-px w-full bg-border relative">
                  <div className="absolute top-0 left-0 h-px bg-foreground transition-all duration-700" style={{ width: `${(cat.value / totalOut) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="technical-label uppercase">Transaction Archive</h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{expenses.length} Entries</span>
          </div>
          <div className="space-y-0">
            <AnimatedList
              items={expenses.slice(0, 10)}
              gap={0}
              animation="scale"
              renderItem={(exp) => (
                <div 
                  onClick={() => openAudit(exp.id)}
                  className="py-4 flex items-center justify-between group hover:bg-muted/30 transition-colors px-2 cursor-pointer border-b border-border/50"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase truncate max-w-[240px] tracking-tight group-hover:pl-1 transition-all">{exp.merchant || "UNSPECIFIED"}</p>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">{new Date(exp.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })} // SANTANDER_TX</p>
                  </div>
                  <div className={cn("text-xs font-mono font-bold", parseFloat(exp.amount) > 0 ? "text-emerald-600" : "")}>
                    <PrivacyValue><NumberTicker value={Math.abs(parseFloat(exp.amount))} prefix={parseFloat(exp.amount) > 0 ? "+" : "€"} /></PrivacyValue>
                  </div>
                </div>
              )}
            />
            <MagneticButton 
              variant="outline" 
              className="w-full text-[10px] font-mono uppercase tracking-[0.2em] py-6 opacity-60 hover:opacity-100 border border-border mt-4 bg-background justify-center" 
              onClick={() => router.push('/expenses')}
            >
              Access Full Archive <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  )
}
