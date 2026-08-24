"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Sparkles, LineChart, CheckCircle2, ArrowUpRight, Bell } from "lucide-react"
import { ResponsiveContainer, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"

interface FeatureSlide {
  id: string
  tabLabel: string
  badge: string
  title: string
  description: string
  visualType: "notification" | "cycle" | "ai" | "forecast"
}

const SHOWCASE_FORECAST_DATA = [
  { dateLabel: "01 Aug", actualBalance: 4850, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "02 Aug", actualBalance: 4830, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "03 Aug", actualBalance: 4760, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "04 Aug", actualBalance: 4810, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null }, // +€50 split reimbursement (UP)
  { dateLabel: "05 Aug", actualBalance: 4710, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "06 Aug", actualBalance: 4680, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "07 Aug", actualBalance: 4725, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null }, // +€45 cashback (UP)
  { dateLabel: "08 Aug", actualBalance: 4580, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "09 Aug", actualBalance: 4540, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "10 Aug", actualBalance: 4540, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "11 Aug", actualBalance: 4430, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "12 Aug", actualBalance: 4470, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null }, // +€40 refund (UP)
  { dateLabel: "13 Aug", actualBalance: 4420, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "14 Aug", actualBalance: 4330, projectionBalance: null, optimisticBalance: null, pessimisticBalance: null },
  { dateLabel: "15 Aug", actualBalance: 4290, projectionBalance: 4290, optimisticBalance: 4290, pessimisticBalance: 4290 },
  { dateLabel: "16 Aug", actualBalance: null, projectionBalance: 4245, optimisticBalance: 4270, pessimisticBalance: 4200 },
  { dateLabel: "17 Aug", actualBalance: null, projectionBalance: 4210, optimisticBalance: 4250, pessimisticBalance: 4140 },
  { dateLabel: "18 Aug", actualBalance: null, projectionBalance: 4235, optimisticBalance: 4290, pessimisticBalance: 4090 }, // +€25 slight recovery (UP)
  { dateLabel: "19 Aug", actualBalance: null, projectionBalance: 4175, optimisticBalance: 4250, pessimisticBalance: 4010 },
  { dateLabel: "20 Aug", actualBalance: null, projectionBalance: 4120, optimisticBalance: 4210, pessimisticBalance: 3930 },
  { dateLabel: "21 Aug", actualBalance: null, projectionBalance: 4075, optimisticBalance: 4180, pessimisticBalance: 3860 },
  { dateLabel: "22 Aug", actualBalance: null, projectionBalance: 3935, optimisticBalance: 4080, pessimisticBalance: 3690 }, // Fixed bill step
  { dateLabel: "23 Aug", actualBalance: null, projectionBalance: 3905, optimisticBalance: 4060, pessimisticBalance: 3630 },
  { dateLabel: "24 Aug", actualBalance: null, projectionBalance: 3940, optimisticBalance: 4110, pessimisticBalance: 3580 }, // +€35 refund (UP)
  { dateLabel: "25 Aug", actualBalance: null, projectionBalance: 3875, optimisticBalance: 4065, pessimisticBalance: 3500 },
  { dateLabel: "26 Aug", actualBalance: null, projectionBalance: 3815, optimisticBalance: 4020, pessimisticBalance: 3420 },
  { dateLabel: "27 Aug", actualBalance: null, projectionBalance: 3755, optimisticBalance: 3975, pessimisticBalance: 3340 },
  { dateLabel: "28 Aug", actualBalance: null, projectionBalance: 3705, optimisticBalance: 3935, pessimisticBalance: 3265 },
  { dateLabel: "29 Aug", actualBalance: null, projectionBalance: 3655, optimisticBalance: 3895, pessimisticBalance: 3195 },
  { dateLabel: "30 Aug", actualBalance: null, projectionBalance: 3610, optimisticBalance: 3860, pessimisticBalance: 3150 },
]

const SLIDES: FeatureSlide[] = [
  {
    id: "notification",
    tabLabel: "Live Capture",
    badge: "Zero-Credential Ingestion",
    title: "ZERO BANK PASSWORDS REQUIRED. CAPTURE EXPENSES LIVE ON DEVICE.",
    description: "Never share sensitive banking logins. Our native Android listener detects bank, card, and payment notifications in real time, extracting amounts and merchants with 100% device-level privacy.",
    visualType: "notification"
  },
  {
    id: "cycle",
    tabLabel: "Paycheck Cycles",
    badge: "Real-World Timing",
    title: "BUILT AROUND YOUR PAYDAY, NOT ARBITRARY CALENDAR DATES.",
    description: "Traditional budgeting apps fail because bills don't restart on the 1st of the month. Leger tracks your financial health from paycheck to paycheck, giving you total clarity over your actual spending power.",
    visualType: "cycle"
  },
  {
    id: "ai",
    tabLabel: "AI Cleansing",
    badge: "Automatic Cleansing",
    title: "MESSY BANK STATEMENTS TRANSFORMED INTO ORGANIZED INSIGHTS.",
    description: "Say goodbye to tedious spreadsheet entry. Our intelligent assistant automatically parses raw bank extracts, cleans cryptic merchant names, and categorizes every expense in seconds.",
    visualType: "ai"
  },
  {
    id: "forecast",
    tabLabel: "Smart Forecasts",
    badge: "Dynamic Forecasting",
    title: "KNOW EXACTLY WHERE YOU'LL STAND BEFORE THE CYCLE ENDS.",
    description: "Life changes fast. Our adaptive forecasting engine learns from your recent lifestyle shifts and daily spending velocity, accurately predicting your end-of-cycle savings so you can spend with confidence.",
    visualType: "forecast"
  }
]

export function AuthShowcase() {
  const [activeTab, setActiveTab] = useState<string>("notification")
  const [isPaused, setIsPaused] = useState(false)
  const currentSlide = SLIDES.find(s => s.id === activeTab) || SLIDES[0]

  // Auto-play showcase slides every 5.5s (pauses on user hover)
  React.useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const currentIndex = SLIDES.findIndex((s) => s.id === prev)
        const nextIndex = (currentIndex + 1) % SLIDES.length
        return SLIDES[nextIndex].id
      })
    }, 5500)

    return () => clearInterval(interval)
  }, [isPaused, activeTab])

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full max-w-xl xl:max-w-2xl flex flex-col justify-center space-y-4 sm:space-y-5 text-foreground my-auto select-none font-mono"
    >
      
      {/* Industrial Blueprint Header */}
      <div className="space-y-2.5 border-b border-border/80 pb-4 relative">
        <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tighter text-foreground leading-[0.95] uppercase font-sans">
          MASTER YOUR MONEY <br className="hidden sm:inline" />
          <span className="text-muted-foreground font-light">WITHOUT SPREADSHEET ANXIETY.</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl font-mono">
          Personal finance engineered for peace of mind. Automated capture, real-world cycle forecasting, and privacy-first local telemetry.
        </p>
      </div>

      {/* Rigid Tab Navigation (4 columns with animated progress indicator) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-border/80 bg-background divide-y sm:divide-y-0 sm:divide-x divide-border/80 relative">
        {SLIDES.map((slide) => {
          const isActive = slide.id === activeTab
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveTab(slide.id)}
              className={cn(
                "px-3 py-2.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors rounded-none text-center cursor-pointer relative overflow-hidden",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span>{slide.tabLabel}</span>
              {isActive && !isPaused && (
                <motion.div 
                  key={slide.id}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5.5, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-[2.5px] bg-emerald-500"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Main Industrial Blueprint Showcase Container */}
      <Tilt rotationFactor={3} className="border border-border/80 bg-card/60 hover:border-emerald-500/30 hover:bg-secondary/35 transition-all duration-300 p-5 sm:p-6 relative h-[395px] sm:h-[420px] flex flex-col justify-between rounded-none shadow-none group overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 flex flex-col justify-between z-10 h-full"
          >
            {/* Header Badge & Title */}
            <div className="min-h-[90px] sm:min-h-[95px] space-y-1.5 border-l-2 border-emerald-500 pl-3 flex flex-col justify-center">
              <span className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider block font-mono">
                {currentSlide.badge}
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground uppercase font-sans">
                {currentSlide.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                {currentSlide.description}
              </p>
            </div>

            {/* DYNAMIC INDUSTRIAL VISUAL MOCKUPS */}
            <div className="pt-3 border-t border-border/60 h-[240px] sm:h-[255px] flex flex-col justify-center">
              {currentSlide.visualType === "notification" && (
                <div className="space-y-3 bg-background border border-border/80 p-4 rounded-none text-xs font-mono">
                  <div className="bg-secondary/40 border border-border/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        <Bell className="h-3.5 w-3.5 text-emerald-500" />
                        Bank App · Payment Approved
                      </span>
                      <span className="text-[10px] text-muted-foreground">Just now</span>
                    </div>
                    <p className="text-xs text-foreground font-bold truncate">
                      Card transaction of €14.80 at Grocery Market
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-500 font-bold">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Captured in 0.1s · Zero Passwords Shared
                    </span>
                    <span className="text-[11px] uppercase bg-emerald-500/20 px-2 py-0.5 border border-emerald-500/40">
                      -€14.80 Auto-Logged
                    </span>
                  </div>
                </div>
              )}
              {currentSlide.visualType === "cycle" && (
                <div className="space-y-3.5 bg-background border border-border/80 p-4 sm:p-5 rounded-none">
                  <div className="flex justify-between items-center text-xs font-mono border-b border-border/60 pb-2.5">
                    <span className="text-muted-foreground font-bold flex items-center gap-2 uppercase">
                      <span className="h-2 w-2 rounded-none bg-emerald-500 inline-block" />
                      Active Paycheck Cycle
                    </span>
                    <span className="text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-none text-xs uppercase">
                      +€1,450.00 Net Surplus
                    </span>
                  </div>

                  {/* Rigid Bidirectional Pocket Bar */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Inflow: €4,800</span>
                      <span className="text-foreground font-bold">Remaining Power: 68%</span>
                      <span className="text-muted-foreground">Outflow: €3,350</span>
                    </div>
                    <div className="h-3.5 w-full bg-secondary rounded-none overflow-hidden border border-border/80 relative">
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/60 z-10 -translate-x-1/2" />
                      <motion.div
                        className="absolute top-0 bottom-0 left-1/2 bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: "34%" }}
                        transition={{ duration: 0.5, type: "tween" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentSlide.visualType === "ai" && (
                <div className="space-y-2.5 bg-background border border-border/80 p-4 rounded-none text-xs font-mono">
                  <div className="space-y-1 opacity-75">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Raw Bank Extract
                    </span>
                    <div className="text-foreground bg-secondary/40 p-2.5 border border-border/40 truncate font-mono text-xs">
                      POSIX/DEBIT 4920 STARBUCKS COFFEE #892
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-muted-foreground py-0.5">
                    <span className="text-xs tracking-wider text-emerald-500/90 font-bold">AI Cleansing &amp; Categorizing...</span>
                  </div>

                  <div className="space-y-1 bg-emerald-500/10 border border-emerald-500/30 p-3">
                    <div className="flex items-center justify-between text-[11px] text-emerald-500 font-bold uppercase">
                      <span>Cleansed &amp; Categorized</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center justify-between text-foreground font-bold pt-1">
                      <span>Starbucks Coffee <span className="text-xs font-normal text-muted-foreground block sm:inline sm:ml-2">• Dining &amp; Coffee</span></span>
                      <span className="text-emerald-500 font-mono">-€4.50</span>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide.visualType === "forecast" && (
                <div className="bg-background border border-border/80 p-3.5 rounded-none space-y-2 font-mono text-xs">
                  {/* Telemetry Header */}
                  <div className="flex justify-between items-center text-xs border-b border-border/60 pb-1.5">
                    <span className="text-muted-foreground font-bold flex items-center gap-1.5 uppercase">
                      <span className="h-1.5 w-1.5 bg-foreground rounded-none inline-block" />
                      Prediction Engine Simulator
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/80 px-2 py-0.5 border border-border/70 font-bold">
                      λ = 0.12 · 6d Half-Life
                    </span>
                  </div>

                  {/* Real Dashboard Recharts AreaChart */}
                  <div className="h-[135px] sm:h-[145px] w-full mt-0.5 select-none font-mono" data-no-swipe="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={SHOWCASE_FORECAST_DATA} 
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="authActiveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="authProjectionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.06}/>
                            <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis 
                          dataKey="dateLabel" 
                          axisLine={false} 
                          tickLine={false} 
                          interval={4}
                          style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                          dy={5}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                          tickFormatter={(val) => `€${Math.round(val)}`}
                          domain={['dataMin - 150', 'dataMax + 150']}
                        />
                        {/* 1st Half: Stepped Executed Actuals */}
                        <Area 
                          type="stepAfter" 
                          dataKey="actualBalance" 
                          stroke="var(--foreground)" 
                          strokeWidth={2} 
                          fill="url(#authActiveGradient)" 
                          fillOpacity={1} 
                          name="Active" 
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                        {/* 2nd Half: Average Expected Trajectory (P50) */}
                        <Area 
                          type="monotone" 
                          dataKey="projectionBalance" 
                          stroke="var(--foreground)" 
                          strokeOpacity={0.5} 
                          strokeWidth={1.5} 
                          strokeDasharray="5 5" 
                          fill="url(#authProjectionGradient)" 
                          fillOpacity={1}
                          name="Projection" 
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                        {/* Max (Optimistic Scenario P10) */}
                        <Area 
                          type="monotone" 
                          dataKey="optimisticBalance" 
                          stroke="var(--foreground)" 
                          strokeOpacity={0.2} 
                          strokeWidth={1.0} 
                          strokeDasharray="3 3" 
                          fill="none" 
                          name="Optimistic" 
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                        {/* Min (Pessimistic Scenario P90) */}
                        <Area 
                          type="monotone" 
                          dataKey="pessimisticBalance" 
                          stroke="var(--foreground)" 
                          strokeOpacity={0.2} 
                          strokeWidth={1.0} 
                          strokeDasharray="3 3" 
                          fill="none" 
                          name="Pessimistic" 
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Outcome Prediction Pills (Min / Expected / Max) */}
                  <div className="grid grid-cols-3 gap-2.5 text-center pt-1 border-t border-border/50">
                    <div className="bg-secondary/30 border border-border/60 p-1.5 space-y-0.5">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold block">Min</span>
                      <span className="text-xs font-bold text-muted-foreground font-mono">+€3,150</span>
                    </div>
                    <div className="bg-secondary/80 border border-border p-1.5 space-y-0.5 relative">
                      <span className="text-[9px] uppercase text-foreground font-bold block">Expected</span>
                      <span className="text-xs font-bold text-foreground font-mono">+€3,610</span>
                    </div>
                    <div className="bg-secondary/30 border border-border/60 p-1.5 space-y-0.5">
                      <span className="text-[9px] uppercase text-foreground/80 font-bold block">Max</span>
                      <span className="text-xs font-bold text-foreground/80 font-mono">+€3,860</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <ClippedCircle circleClassName="bg-foreground/5" circleSize={500} />
      </Tilt>
    </div>
  )
}
