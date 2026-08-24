"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Sparkles, LineChart, ShieldCheck, Lock, Zap, CheckCircle2, ArrowUpRight, Bell } from "lucide-react"
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
  const currentSlide = SLIDES.find(s => s.id === activeTab) || SLIDES[0]

  return (
    <div className="w-full max-w-xl flex flex-col justify-center space-y-6 text-foreground my-auto py-6 px-2 select-none font-mono">
      
      {/* Industrial Blueprint Header */}
      <div className="space-y-4 border-b border-border/80 pb-6 relative">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-none bg-emerald-500 inline-block" />
            <span>THE MODERN FINANCIAL OS</span>
          </span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground leading-[0.95] uppercase font-sans">
          MASTER YOUR MONEY <br className="hidden sm:inline" />
          <span className="text-muted-foreground font-light">WITHOUT SPREADSHEET ANXIETY.</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg font-mono">
          Experience personal finance engineered for peace of mind. Effortless tracking, intelligent automation, and crystal-clear visibility into your financial future.
        </p>

        {/* Technical Corner Crosshairs */}
        <div className="absolute -bottom-1 -left-1 text-muted-foreground/40 text-xs font-mono">+</div>
        <div className="absolute -bottom-1 -right-1 text-muted-foreground/40 text-xs font-mono">+</div>
      </div>

      {/* Rigid Tab Navigation (4 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-border/80 bg-background divide-y sm:divide-y-0 sm:divide-x divide-border/80">
        {SLIDES.map((slide) => {
          const isActive = slide.id === activeTab
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveTab(slide.id)}
              className={cn(
                "px-2.5 py-2.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors rounded-none text-center cursor-pointer relative",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span>{slide.tabLabel}</span>
            </button>
          )
        })}
      </div>

      {/* Main Industrial Blueprint Showcase Container */}
      <Tilt rotationFactor={4} className="border border-border/80 bg-card/60 hover:bg-secondary/35 transition-all duration-300 p-5 sm:p-7 relative min-h-[400px] sm:min-h-[420px] h-auto flex flex-col justify-between rounded-none shadow-none group overflow-hidden">
        
        {/* Corner Crosshairs */}
        <div className="absolute top-1 left-1 text-muted-foreground/30 text-[10px] leading-none z-10">+</div>
        <div className="absolute top-1 right-1 text-muted-foreground/30 text-[10px] leading-none z-10">+</div>
        <div className="absolute bottom-1 left-1 text-muted-foreground/30 text-[10px] leading-none z-10">+</div>
        <div className="absolute bottom-1 right-1 text-muted-foreground/30 text-[10px] leading-none z-10">+</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-4 flex-1 flex flex-col justify-between z-10"
          >
            {/* Header Badge & Title */}
            <div className="space-y-2 border-l-2 border-emerald-500 pl-3">
              <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider block font-mono">
                {currentSlide.badge}
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground uppercase font-sans">
                {currentSlide.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                {currentSlide.description}
              </p>
            </div>

            {/* DYNAMIC INDUSTRIAL VISUAL MOCKUPS */}
            <div className="pt-4 border-t border-border/60">
              {currentSlide.visualType === "notification" && (
                <div className="space-y-2.5 bg-background border border-border/80 p-3.5 rounded-none text-xs font-mono">
                  <div className="bg-secondary/40 border border-border/70 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase">
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <Bell className="h-3 w-3 text-emerald-500" />
                        Bank App · Payment Approved
                      </span>
                      <span className="text-[9px] text-muted-foreground">Just now</span>
                    </div>
                    <p className="text-[11px] text-foreground font-bold truncate">
                      Card transaction of €14.80 at Grocery Market
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-emerald-500/10 border border-emerald-500/30 p-2 text-emerald-500 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Captured in 0.1s · Zero Passwords Shared
                    </span>
                    <span className="text-[10px] uppercase bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-500/40">
                      -€14.80 Auto-Logged
                    </span>
                  </div>
                </div>
              )}
              {currentSlide.visualType === "cycle" && (
                <div className="space-y-3 bg-background border border-border/80 p-4 rounded-none">
                  <div className="flex justify-between items-center text-xs font-mono border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold flex items-center gap-1.5 uppercase">
                      <span className="h-1.5 w-1.5 rounded-none bg-emerald-500 inline-block" />
                      Active Paycheck Cycle
                    </span>
                    <span className="text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-none text-[11px] uppercase">
                      +€1,450.00 Net Surplus
                    </span>
                  </div>

                  {/* Rigid Bidirectional Pocket Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">Inflow: €4,800</span>
                      <span className="text-foreground font-bold">Remaining Power: 68%</span>
                      <span className="text-muted-foreground">Outflow: €3,350</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-none overflow-hidden border border-border/80 relative">
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
                <div className="space-y-2 bg-background border border-border/80 p-4 rounded-none text-xs font-mono">
                  <div className="space-y-1 opacity-70">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Raw Bank Extract
                    </span>
                    <div className="text-foreground bg-secondary/40 p-2 border border-border/40 truncate font-mono text-[11px]">
                      POSIX/DEBIT 4920 STARBUCKS COFFEE #892
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-muted-foreground py-1">
                    <span className="text-[11px] tracking-wider text-emerald-500/80">AI Cleansing &amp; Categorizing...</span>
                  </div>

                  <div className="space-y-1 bg-emerald-500/10 border border-emerald-500/30 p-2.5">
                    <div className="flex items-center justify-between text-[10px] text-emerald-500 font-bold uppercase">
                      <span>Cleansed &amp; Categorized</span>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div className="flex items-center justify-between text-foreground font-bold pt-1">
                      <span>Starbucks Coffee <span className="text-[11px] font-normal text-muted-foreground block sm:inline sm:ml-2">• Dining &amp; Coffee</span></span>
                      <span className="text-emerald-500">-€4.50</span>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide.visualType === "forecast" && (
                <div className="bg-background border border-border/80 p-3.5 rounded-none space-y-2.5 font-mono text-xs">
                  {/* Header with Decay Telemetry */}
                  <div className="flex justify-between items-center text-[11px] border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold flex items-center gap-1.5 uppercase">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-none inline-block" />
                      λ = 0.12 Exponential Decay
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/60 px-2 py-0.5 border border-border/60">
                      Safe Burn: €48.20/day
                    </span>
                  </div>

                  {/* Scenario Bands Grid (P10 / P50 / P90) */}
                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div className="bg-secondary/30 border border-border/60 p-2 space-y-0.5">
                      <span className="text-[9px] uppercase text-emerald-500 font-bold block">P10 Best</span>
                      <span className="text-xs font-bold text-emerald-500">+€4,120</span>
                    </div>
                    <div className="bg-secondary/60 border border-border p-2 space-y-0.5 relative">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] font-bold uppercase px-1">
                        Expected
                      </div>
                      <span className="text-[9px] uppercase text-muted-foreground font-bold block">P50 Median</span>
                      <span className="text-xs font-bold text-foreground">+€3,840</span>
                    </div>
                    <div className="bg-secondary/30 border border-border/60 p-2 space-y-0.5">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold block">P90 Floor</span>
                      <span className="text-xs font-bold text-muted-foreground">+€3,410</span>
                    </div>
                  </div>

                  {/* Deducted Recurring Commitments Footer */}
                  <div className="flex items-center justify-between text-[10px] bg-secondary/20 border border-border/40 p-1.5 text-muted-foreground">
                    <span>Auto-Deducted Fixed Bills:</span>
                    <span className="text-foreground font-bold font-mono">-€420.00 (Rent &amp; Utilities)</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <ClippedCircle circleClassName="bg-foreground/5" circleSize={500} />
      </Tilt>

      {/* Rigid Utility Assurance Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border/80 bg-background divide-y sm:divide-y-0 sm:divide-x divide-border/80 text-[11px] text-muted-foreground font-bold tracking-wider text-center sm:text-left">
        <div className="p-2.5 flex items-center justify-center sm:justify-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <span className="truncate">Bank-Grade Privacy</span>
        </div>
        <div className="p-2.5 flex items-center justify-center sm:justify-start gap-2">
          <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <span className="truncate">256-Bit Encryption</span>
        </div>
        <div className="p-2.5 flex items-center justify-center sm:justify-start gap-2">
          <Zap className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <span className="truncate">Instant Cloud Sync</span>
        </div>
      </div>

    </div>
  )
}
