"use client"

import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  Info,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { detectRecurringCadence, DetectedSubscription } from "@/lib/cadence-detector"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { PrivacyValue } from "@/components/ui/privacy-value"

interface SubscriptionRadarProps {
  expenses: any[]
  cycleStartDate?: string | Date
  cycleEndDate?: string | Date
}

export function SubscriptionRadar({ expenses, cycleStartDate, cycleEndDate }: SubscriptionRadarProps) {
  const { currencySymbol, isPro } = useSystem()
  const [filterCadence, setFilterCadence] = useState<string>("all")

  const radarData = useMemo(() => {
    return detectRecurringCadence(expenses || [], cycleStartDate, cycleEndDate)
  }, [expenses, cycleStartDate, cycleEndDate])

  const filteredSubscriptions = useMemo(() => {
    if (filterCadence === "all") return radarData.subscriptions
    return radarData.subscriptions.filter(s => s.cadence === filterCadence)
  }, [radarData.subscriptions, filterCadence])

  const totalMonthly = radarData.totalMonthlyCommitment
  const totalAnnual = radarData.totalAnnualCommitment
  const hikeCount = radarData.priceIncreases.length

  return (
    <div className="space-y-8 font-mono">
      {/* 1. Executive Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Commitment */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              Monthly Recurring
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              <PrivacyValue>{currencySymbol}{totalMonthly.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-sans z-10">
            Fixed commitments across {radarData.subscriptions.length} active service{radarData.subscriptions.length !== 1 ? "s" : ""}.
          </p>
        </Tilt>

        {/* Metric 2: Annual Projected Cost */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              Annual Projected
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              <PrivacyValue>{currencySymbol}{totalAnnual.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1">/yr</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-sans z-10">
            Estimated 12-month recurring cash outflow.
          </p>
        </Tilt>

        {/* Metric 3: Active Subscriptions */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              Detected Services
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              {radarData.subscriptions.length}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-sans z-10">
            Automated cadence tracking.
          </p>
        </Tilt>

        {/* Metric 4: Silent Price Hikes */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              Price Hikes Flagged
            </span>
            <div className={cn(
              "text-2xl md:text-3xl font-mono font-bold tracking-tighter z-10",
              hikeCount > 0 ? "text-amber-500" : "text-foreground"
            )}>
              {hikeCount}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-sans z-10">
            {hikeCount > 0 ? "Unannounced rate increases detected." : "Zero price jumps detected."}
          </p>
        </Tilt>
      </div>

      {/* 2. Silent Price Hike Banner (if any) */}
      {radarData.priceIncreases.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Silent Subscription Price Increase Detected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {radarData.priceIncreases.map((hike, idx) => (
              <div key={idx} className="p-3 bg-background/80 border border-border rounded-lg text-xs space-y-1">
                <div className="font-bold text-foreground truncate">{hike.merchant}</div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono">
                  <span>was {currencySymbol}{hike.previousAmount.toFixed(2)}</span>
                  <span className="text-amber-500 font-bold">→ {currencySymbol}{hike.newAmount.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                  +{hike.increasePercent}% increase
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Subscriptions Explorer & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-foreground" />
              <span>Active Recurring Radar</span>
            </h3>
            <p className="text-[11px] text-muted-foreground font-sans">
              Algorithmic detection of cadences, recurrence drift, and renewal projections.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["all", "monthly", "annual", "weekly"].map((cad) => (
              <button
                key={cad}
                type="button"
                onClick={() => setFilterCadence(cad)}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer border rounded-none",
                  filterCadence === cad
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground border-border hover:bg-secondary"
                )}
              >
                {cad}
              </button>
            ))}
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center border border-border/40 bg-card/10 space-y-2 rounded-xl">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No recurring subscriptions detected for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSubscriptions.map((sub) => {
              const isHiked = sub.status === "price_jump" || (sub.priceChangePercent && sub.priceChangePercent > 5)
              
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "p-4 bg-card/40 hover:bg-card/70 border border-border transition-all space-y-3 rounded-xl flex flex-col justify-between relative group",
                    isHiked && "border-amber-500/40"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{sub.merchant}</div>
                        <div className="text-[10px] text-muted-foreground font-sans truncate">
                          {sub.categoryName || "Fixed Recurring Bill"}
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0 rounded",
                        sub.cadence === "monthly" && "bg-secondary text-foreground border-border",
                        sub.cadence === "annual" && "bg-secondary text-foreground border-border",
                        sub.cadence === "weekly" && "bg-secondary text-foreground border-border",
                        isHiked && "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      )}>
                        {sub.cadence}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Latest Charge</span>
                      <span className="text-base font-bold text-foreground font-mono">
                        <PrivacyValue>{currencySymbol}{sub.latestAmount.toFixed(2)}</PrivacyValue>
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span>Next: {sub.nextExpectedDate.split("T")[0]}</span>
                    </div>
                    <span className="text-[9px] opacity-70">
                      {sub.occurrences}x detected
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
