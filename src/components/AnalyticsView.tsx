"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  AreaChart, 
  Area, 
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
  Landmark
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { NumberTicker } from "@/components/ui/number-ticker"

interface AnalyticsViewProps {
  expenses: any[]
  categories: any[]
  paychecks: any[]
  currentMonth: number
  currentYear: number
}

export function AnalyticsView({ expenses, categories, paychecks: initialPaychecks }: AnalyticsViewProps) {
  
  const analyticsData = useMemo(() => {
    // 1. Sort paychecks chronologically (OLDEST FIRST) to build correct ranges
    const sortedPaychecks = [...initialPaychecks].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (sortedPaychecks.length === 0) return { hasData: false }

    // 2. Build Cycles with correct end dates
    const cycles = sortedPaychecks.map((pc, index) => {
      const startDate = new Date(pc.date)
      // End date is the start of the NEXT paycheck
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
        dateLabel: startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        spending,
        income,
        isDeficit: spending > (income || 0),
        startDate
      }
    })

    const trendData = cycles.slice(-12) // Last 12 cycles

    const averageSpending = trendData.length > 0 
      ? trendData.reduce((sum, d) => sum + d.spending, 0) / trendData.length 
      : 0

    // Recent comparisons (using chronological order, so current is last)
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
      hasData: true
    }
  }, [expenses, initialPaychecks])

  if (!analyticsData.hasData || !analyticsData.currentCycle) {
    return <div className="p-8 text-center text-muted-foreground font-mono uppercase text-xs">Insufficient data for node synchronization.</div>
  }

  const { 
    currentCycle, 
    previousCycle, 
    cycleChange, 
    trendData = [], 
    averageSpending 
  } = analyticsData

  return (
    <div className="mx-auto max-w-5xl space-y-10 md:space-y-16 pb-24 md:pb-8 w-full">
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="absolute top-0 right-0 technical-label opacity-20 hidden lg:block uppercase tracking-widest text-[9px]">
          NODE_ID: TREND_SYNTH_04 // ANALYTICS
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Neural Trend Synthesis</span>
            <span className="opacity-30">/</span>
            <span>GLOBAL_NODE</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase leading-none">
            Analytics
          </h1>
        </div>
      </header>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-border ledger-border divide-y sm:divide-y-0 sm:divide-x border-x-0 sm:border-x divide-border bg-card overflow-hidden">
        {[
          { label: "CURRENT_BURN", value: currentCycle.spending, sub: `STARTED ${currentCycle.dateLabel}`, icon: Activity },
          { label: "PREVIOUS_BURN", value: previousCycle?.spending || 0, sub: previousCycle ? `STARTED ${previousCycle.dateLabel}` : "INITIAL_DATA", icon: History },
          { label: "CYCLE_VELOCITY", value: Math.abs(cycleChange), prefix: cycleChange > 0 ? "+" : "-", suffix: "%", color: cycleChange > 0 ? "text-destructive" : "text-emerald-600", icon: Percent },
          { label: "LIFETIME_AVG", value: averageSpending, sub: "MEAN_CONSUMPTION", icon: ShieldCheck }
        ].map((metric, idx) => (
          <div key={idx} className="p-6 md:p-8 space-y-4 hover:bg-secondary/30 transition-colors group">
            <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
              <span className="technical-label text-[8px] md:text-[9px]">{metric.label}</span>
              <metric.icon className="h-3 w-3" />
            </div>
            <div className={cn("text-3xl md:text-4xl font-mono font-bold tracking-tighter", metric.color)}>
              <PrivacyValue>
                {metric.suffix === '%' ? (
                   <span>{metric.prefix}{metric.value.toFixed(1)}%</span>
                ) : (
                   <NumberTicker value={metric.value} prefix="€" />
                )}
              </PrivacyValue>
            </div>
            <p className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{metric.sub || (cycleChange > 0 ? "VELOCITY_INCREASE" : "VELOCITY_OPTIMIZED")}</p>
          </div>
        ))}
      </div>

      {/* 3. Trend Plot */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h2 className="technical-label">Temporal Consumption Trend // PLOT_V4</h2>
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">
                <div className="w-1.5 h-1.5 bg-foreground" />
                ACTIVE_TRAJECTORY
            </div>
        </div>

        <div className="min-h-[300px] md:min-h-[450px] h-fit w-full border border-border ledger-border p-4 md:p-10 bg-card relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-4 left-4 technical-label opacity-10 uppercase tracking-widest font-mono text-[8px] md:text-[9px]">TS_QUANT_V4 // TREND_ARCHIVE</div>
          
          <div className="h-[280px] md:h-[350px] w-full mt-4 md:mt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} tickFormatter={(val) => `€${Math.round(val)}`} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-card border border-border p-3 font-mono text-[9px] md:text-[10px] space-y-2 shadow-sm z-50">
                            <p className="font-bold border-b border-border pb-1 uppercase">{label} Cycle</p>
                            <div className="space-y-1">
                              <p className="flex justify-between gap-8 uppercase"><span>Total Burn:</span> <span>€{data.spending.toFixed(2)}</span></p>
                              <p className={cn("flex justify-between gap-8 uppercase font-bold", data.isDeficit ? "text-destructive" : "text-emerald-600")}>
                                <span>Status:</span> <span>{data.isDeficit ? "DEFICIT" : "STABLE"}</span>
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: '#09090B', strokeWidth: 1 }}
                  />
                  <ReferenceLine 
                    y={averageSpending} 
                    stroke="#86868B" 
                    strokeDasharray="5 5" 
                    label={{ value: 'MEAN_BURN', position: 'right', fill: '#86868B', fontSize: 8, fontFamily: 'var(--font-geist-mono)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spending" 
                    stroke="var(--foreground)" 
                    strokeWidth={2} 
                    fill="url(#colorSpend)" 
                    isAnimationActive={true} 
                  />
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pt-8 border-t border-border/50">
             <div className="space-y-1">
                <p className="technical-label text-[7px] opacity-40 uppercase">Archived Samples</p>
                <p className="text-sm font-mono font-bold">{trendData.length}</p>
             </div>
             <div className="space-y-1">
                <p className="technical-label text-[7px] opacity-40 uppercase">Highest Intensity</p>
                <p className="text-sm font-mono font-bold text-destructive">€{Math.max(...trendData.map(d => d.spending)).toFixed(0)}</p>
             </div>
             <div className="space-y-1">
                <p className="technical-label text-[7px] opacity-40 uppercase">Optimal Threshold</p>
                <p className="text-sm font-mono font-bold text-emerald-600">€{Math.min(...trendData.map(d => d.spending)).toFixed(0)}</p>
             </div>
             <div className="space-y-1">
                <p className="technical-label text-[7px] opacity-40 uppercase">System Integrity</p>
                <p className="text-sm font-mono font-bold uppercase tracking-tighter">Verified</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  )
}
