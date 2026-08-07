"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Percent,
  History,
  ShieldCheck,
  Zap,
  Landmark,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { NumberTicker } from "@/components/ui/number-ticker"
import { useSystem } from "@/lib/SystemContext"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"

interface AnalyticsViewProps {
  expenses: any[]
  categories: any[]
  paychecks: any[]
  currentMonth: number
  currentYear: number
}

export function AnalyticsView({ expenses, categories, paychecks: initialPaychecks }: AnalyticsViewProps) {
  const { currencySymbol } = useSystem()

  // 1. Sort paychecks chronologically (OLDEST FIRST)
  const sortedPaychecks = useMemo(() => {
    return [...initialPaychecks].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [initialPaychecks])

  // 2. Build cycles
  const cycles = useMemo(() => {
    if (sortedPaychecks.length === 0) return []
    return sortedPaychecks.map((pc, index) => {
      const startDate = new Date(pc.date)
      const nextPc = sortedPaychecks[index + 1]
      const endDate = nextPc ? new Date(nextPc.date) : new Date()
      
      const cycleTx = expenses.filter(e => {
        const d = new Date(e.date)
        return d >= startDate && d < endDate
      })

      const spending = cycleTx
        .filter(tx => parseFloat(tx.amount) < 0)
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0)

      const income = cycleTx
        .filter(tx => parseFloat(tx.amount) > 0)
        .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)

      return {
        dateLabel: startDate.toLocaleDateString('en-GB', { month: 'short' }),
        spending,
        income,
        profit: income - spending,
        isDeficit: spending > (income || 0),
        startDate
      }
    })
  }, [sortedPaychecks, expenses])

  // 3. Extract analytics metrics
  const analyticsData = useMemo(() => {
    if (cycles.length === 0) return { hasData: false }

    const trendData = cycles.slice(-12) // Last 12 cycles
    const averageSpending = trendData.length > 0 
      ? trendData.reduce((sum, d) => sum + d.spending, 0) / trendData.length 
      : 0
    const averageProfit = trendData.length > 0 
      ? trendData.reduce((sum, d) => sum + d.profit, 0) / trendData.length 
      : 0

    const currentCycle = cycles[cycles.length - 1]
    const previousCycle = cycles[cycles.length - 2]
    
    let cycleChange = 0
    if (previousCycle && previousCycle.spending > 0) {
      cycleChange = ((currentCycle.spending - previousCycle.spending) / previousCycle.spending) * 100
    }

    return {
      currentCycle,
      previousCycle,
      cycleChange,
      trendData,
      averageSpending,
      averageProfit,
      hasData: true
    }
  }, [cycles])

  // 4. Calculate Category level stats comparing current spend vs baseline
  const categoryStats = useMemo(() => {
    const currentCycle = cycles[cycles.length - 1]
    if (!categories || categories.length === 0 || !currentCycle) return []
    const currentStart = new Date(currentCycle.startDate)
    
    return categories.map(cat => {
      const currentTxs = expenses.filter(e => 
        e.category_id?.toString() === cat.id.toString() &&
        new Date(e.date) >= currentStart
      )
      const currentSpend = currentTxs
        .filter(tx => parseFloat(tx.amount) < 0)
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0)

      const pastTxs = expenses.filter(e => 
        e.category_id?.toString() === cat.id.toString() &&
        new Date(e.date) < currentStart
      )
      const pastSpend = pastTxs
        .filter(tx => parseFloat(tx.amount) < 0)
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0)

      const historicalCyclesWithTx = new Set(
        pastTxs.map(tx => {
          const d = new Date(tx.date)
          const matchingPc = sortedPaychecks.find((pc, idx) => {
            const start = new Date(pc.date)
            const nextPc = sortedPaychecks[idx + 1]
            const end = nextPc ? new Date(nextPc.date) : new Date()
            return d >= start && d < end
          })
          return matchingPc ? matchingPc.date : null
        }).filter(Boolean)
      )

      const divisor = Math.max(1, historicalCyclesWithTx.size)
      const historicalAvg = pastSpend / divisor

      let changePct = 0
      if (historicalAvg > 0) {
        changePct = ((currentSpend - historicalAvg) / historicalAvg) * 100
      }

      return {
        ...cat,
        currentSpend,
        historicalAvg,
        changePct
      }
    }).filter(cat => cat.currentSpend > 0 || cat.historicalAvg > 0)
      .sort((a, b) => b.currentSpend - a.currentSpend)
  }, [categories, expenses, cycles, sortedPaychecks])



  if (!analyticsData.hasData || !analyticsData.currentCycle) {
    return <div className="p-8 text-center text-muted-foreground font-mono uppercase text-xs">Insufficient data for node synchronization.</div>
  }

  const { 
    currentCycle, 
    previousCycle, 
    cycleChange, 
    trendData = [], 
    averageSpending,
    averageProfit
  } = analyticsData

  const off = useMemo(() => {
    if (trendData.length === 0) return 0
    const profits = trendData.map(d => d.profit || 0)
    const max = Math.max(...profits)
    const min = Math.min(...profits)

    if (max > 0 && min < 0) {
      return max / (max - min)
    }
    return max > 0 ? 1 : 0
  }, [trendData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 pb-36 md:pb-8 w-full"
    >
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Financial Analytics</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Analytics
          </h1>
        </div>
      </header>

      {/* 2. Primary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: Net Profit Trajectory */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h2 className="technical-label">Net Profit Trajectory</h2>
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 bg-emerald-500" />
              Net Profit/Loss
            </div>
          </div>

          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card relative overflow-hidden flex flex-col justify-center">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="strokeProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset={off} stopColor="#10b981" />
                      <stop offset={off} stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.28}/>
                      <stop offset={off} stopColor="#10b981" stopOpacity={0.14}/>
                      <stop offset={off} stopColor="#ef4444" stopOpacity={0.14}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.28}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                    tickFormatter={(val) => {
                      const isNegative = val < 0
                      const formatted = Math.abs(Math.round(val))
                      return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`
                    }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                    wrapperStyle={{ outline: 'none' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-card border border-border p-3 font-mono text-[9px] md:text-[10px] space-y-2 shadow-sm z-50 text-foreground">
                            <p className="font-bold border-b border-border pb-1 uppercase">{label} Cycle</p>
                            <div className="space-y-1">
                              <p className="flex justify-between gap-8 uppercase text-emerald-500"><span>Inflow:</span> <span>{currencySymbol}{data.income.toFixed(2)}</span></p>
                              <p className="flex justify-between gap-8 uppercase text-muted-foreground"><span>Outflow:</span> <span>{currencySymbol}{data.spending.toFixed(2)}</span></p>
                              <p className={cn("flex justify-between gap-8 uppercase font-bold border-t border-border pt-1 mt-1", data.profit < 0 ? "text-destructive" : "text-emerald-500")}>
                                <span>Net Profit:</span> <span>{data.profit < 0 ? '-' : ''}{currencySymbol}{Math.abs(data.profit).toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  />
                  <ReferenceLine 
                    y={0} 
                    stroke="var(--border)" 
                    strokeWidth={1}
                  />
                  {averageProfit !== undefined && (
                    <ReferenceLine 
                      y={averageProfit} 
                      stroke="var(--border)" 
                      strokeDasharray="5 5" 
                      label={{ value: 'MEAN PROFIT', position: 'right', fill: '#86868B', fontSize: 8, fontFamily: 'var(--font-geist-mono)' }} 
                    />
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="url(#strokeProfit)" 
                    strokeWidth={2} 
                    fill="url(#colorProfit)" 
                    baseValue={0}
                    isAnimationActive={true} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Chart B: Cash Flow Velocity (Inflows vs Outflows) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h2 className="technical-label">Cash Flow Velocity</h2>
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 bg-emerald-500" />
              Inflow vs Outflow
            </div>
          </div>

          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card relative overflow-hidden flex flex-col justify-center">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-card border border-border p-3 font-mono text-[9px] md:text-[10px] space-y-2 shadow-sm z-50 text-foreground">
                            <p className="font-bold border-b border-border pb-1 uppercase">{label} Cycle</p>
                            <div className="space-y-1">
                              <p className="flex justify-between gap-8 uppercase text-emerald-500 font-bold"><span>Inflow:</span> <span>{currencySymbol}{data.income.toFixed(2)}</span></p>
                              <p className="flex justify-between gap-8 uppercase text-muted-foreground"><span>Outflow:</span> <span>{currencySymbol}{data.spending.toFixed(2)}</span></p>
                              <p className={cn("flex justify-between gap-8 uppercase font-bold border-t border-border pt-1 mt-1", data.income - data.spending < 0 ? "text-destructive" : "text-emerald-500")}>
                                <span>Net:</span> <span>{currencySymbol}{(data.income - data.spending).toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="income" name="Inflow" fill="#10b981" fillOpacity={0.15} stroke="#10b981" strokeWidth={1} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="spending" name="Outflow" fill="var(--foreground)" fillOpacity={0.08} stroke="var(--foreground)" strokeWidth={1} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Current Spending", value: currentCycle.spending, sub: `Started ${currentCycle.dateLabel}`, icon: Activity },
          { label: "Previous Spending", value: previousCycle?.spending || 0, sub: previousCycle ? `Started ${previousCycle.dateLabel}` : "Initial Baseline", icon: History },
          { label: "Cycle Velocity", value: Math.abs(cycleChange), prefix: cycleChange > 0 ? "+" : "-", suffix: "%", color: cycleChange > 0 ? "text-destructive" : "text-emerald-500", icon: Percent },
          { label: "Lifetime Average", value: averageSpending, sub: "Average Consumption", icon: ShieldCheck }
        ].map((metric, idx) => (
          <Tilt key={idx} rotationFactor={6} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
              <span className="technical-label text-[8px] md:text-[9px]">{metric.label}</span>
              <metric.icon className="h-3 w-3" />
            </div>
            <div className={cn("text-2xl lg:text-3xl font-mono font-bold tracking-tighter", metric.color)}>
              <PrivacyValue>
                {metric.suffix === '%' ? (
                   <span>{metric.prefix}{metric.value.toFixed(1)}%</span>
                ) : (
                   <NumberTicker value={metric.value} prefix={currencySymbol} />
                )}
              </PrivacyValue>
            </div>
            <p className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{metric.sub || (cycleChange > 0 ? "Spending Increase" : "Spending Optimized")}</p>
          </Tilt>
        ))}
      </div>

      {/* 4. Category Burn Distribution */}
      <section className="space-y-6 [content-visibility:auto] [contain-intrinsic-size:1px_300px]">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <h2 className="technical-label">Historical Category Comparison</h2>
          <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            <Landmark className="h-3 w-3 text-muted-foreground" />
            <span>Baseline Drift</span>
          </div>
        </div>

        {categoryStats.length === 0 ? (
          <div className="border border-border ledger-border p-8 text-center text-muted-foreground font-mono uppercase text-xs">No active category distributions detected.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categoryStats.map((cat, idx) => {
              const maxVal = Math.max(cat.currentSpend, cat.historicalAvg)
              const currentPct = maxVal > 0 ? (cat.currentSpend / maxVal) * 100 : 0
              const avgPct = maxVal > 0 ? (cat.historicalAvg / maxVal) * 100 : 0

              return (
                <div key={idx} className="border border-border ledger-border bg-card/40 p-4 md:p-6 space-y-4 hover:bg-secondary/35 transition-all duration-300 relative group overflow-hidden select-none cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs uppercase tracking-tight text-foreground truncate max-w-[150px]">
                        {cat.name}
                      </h4>
                    </div>
                    {cat.changePct !== 0 && (
                      <span className={cn(
                        "font-mono text-[9px] px-1.5 py-0.5 border font-bold uppercase tracking-tighter shrink-0",
                        cat.changePct > 0 
                          ? "text-destructive border-destructive/20 bg-destructive/5" 
                          : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                      )}>
                        {cat.changePct > 0 ? "+" : ""}{cat.changePct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Horizontal Bar Model */}
                  <div className="space-y-2 pt-2">
                    <div className="h-1 w-full bg-secondary/50 relative overflow-hidden">
                      {/* Average Marker Bar */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-muted-foreground/30 border-r border-muted-foreground/60"
                        style={{ width: `${avgPct}%` }}
                      />
                      {/* Current Spend Fill */}
                      <div 
                        className={cn(
                          "absolute top-0 bottom-0 left-0 transition-all duration-500",
                          cat.currentSpend > cat.historicalAvg ? "bg-destructive" : "bg-emerald-500"
                        )}
                        style={{ width: `${currentPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-[8px] text-muted-foreground uppercase">
                      <span>Current: {currencySymbol}{cat.currentSpend.toFixed(0)}</span>
                      <span>Baseline: {currencySymbol}{cat.historicalAvg.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </motion.div>
  )
}
