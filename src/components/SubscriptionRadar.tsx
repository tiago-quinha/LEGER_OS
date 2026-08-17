"use client"

import React, { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Info,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  X,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { detectRecurringCadence, DetectedSubscription } from "@/lib/cadence-detector"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { toast } from "sonner"

interface SubscriptionRadarProps {
  expenses: any[]
  cycleStartDate?: string | Date
  cycleEndDate?: string | Date
}

export function SubscriptionRadar({ expenses, cycleStartDate, cycleEndDate }: SubscriptionRadarProps) {
  const { currencySymbol, isPro } = useSystem()
  const [filterCadence, setFilterCadence] = useState<"all" | "monthly" | "annual">("all")
  const [dismissedMerchants, setDismissedMerchants] = useState<string[]>([])
  const [cadenceOverrides, setCadenceOverrides] = useState<Record<string, "monthly" | "annual">>({})
  const [selectedSubForDetails, setSelectedSubForDetails] = useState<DetectedSubscription | null>(null)

  // Load dismissed merchants & cadence overrides from localStorage
  useEffect(() => {
    try {
      const storedDismissed = localStorage.getItem("leger_dismissed_subscriptions")
      if (storedDismissed) {
        setDismissedMerchants(JSON.parse(storedDismissed))
      }
      const storedOverrides = localStorage.getItem("leger_subscription_cadence_overrides")
      if (storedOverrides) {
        setCadenceOverrides(JSON.parse(storedOverrides))
      }
    } catch (e) {}
  }, [])

  const handleToggleCadence = (merchantName: string, currentCadence: "monthly" | "annual", e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nextCadence: "monthly" | "annual" = currentCadence === "monthly" ? "annual" : "monthly"
    const updated = {
      ...cadenceOverrides,
      [merchantName.toUpperCase()]: nextCadence
    }
    setCadenceOverrides(updated)
    try {
      localStorage.setItem("leger_subscription_cadence_overrides", JSON.stringify(updated))
      toast.success(`${merchantName.toUpperCase()} SET TO ${nextCadence.toUpperCase()}`)
    } catch (e) {}

    if (selectedSubForDetails && selectedSubForDetails.merchant.toUpperCase() === merchantName.toUpperCase()) {
      setSelectedSubForDetails(prev => prev ? { ...prev, cadence: nextCadence } : null)
    }
  }

  const handleDismiss = (merchantName: string) => {
    const updated = [...dismissedMerchants, merchantName.toUpperCase()]
    setDismissedMerchants(updated)
    try {
      localStorage.setItem("leger_dismissed_subscriptions", JSON.stringify(updated))
      toast.success(`${merchantName.toUpperCase()} EXCLUDED FROM RADAR`)
    } catch (e) {}
    setSelectedSubForDetails(null)
  }

  const handleResetDismissed = () => {
    setDismissedMerchants([])
    try {
      localStorage.removeItem("leger_dismissed_subscriptions")
      toast.success("RESTORED ALL EXCLUDED SUBSCRIPTIONS")
    } catch (e) {}
  }

  const radarData = useMemo(() => {
    return detectRecurringCadence(
      expenses || [], 
      cycleStartDate, 
      cycleEndDate, 
      dismissedMerchants,
      cadenceOverrides
    )
  }, [expenses, cycleStartDate, cycleEndDate, dismissedMerchants, cadenceOverrides])

  const filteredSubscriptions = useMemo(() => {
    if (filterCadence === "all") return radarData.subscriptions
    return radarData.subscriptions.filter(s => s.cadence === filterCadence)
  }, [radarData.subscriptions, filterCadence])

  const totalMonthly = radarData.totalMonthlyCommitment
  const totalAnnual = radarData.totalAnnualCommitment
  const hikeCount = radarData.priceIncreases.length

  return (
    <div className="space-y-8 font-mono">
      {/* Excluded Restoral Banner if items were dismissed */}
      {dismissedMerchants.length > 0 && (
        <div className="p-3 bg-secondary/40 border border-border flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground font-mono uppercase text-[11px]">
            <Info className="h-4 w-4 shrink-0 text-foreground" />
            <span>{dismissedMerchants.length} SUBSCRIPTION{dismissedMerchants.length !== 1 ? "S" : ""} CURRENTLY EXCLUDED</span>
          </div>
          <button
            type="button"
            onClick={handleResetDismissed}
            className="h-7 px-3 bg-foreground text-background font-bold text-[10px] uppercase tracking-wider hover:bg-foreground/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="h-3 w-3" />
            <span>RESTORE ALL ({dismissedMerchants.length})</span>
          </button>
        </div>
      )}

      {/* 1. Executive Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Commitment */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              MONTHLY RECURRING
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              <PrivacyValue>{currencySymbol}{totalMonthly.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1">/MO</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            FIXED OVERHEAD ACROSS {radarData.subscriptions.length} ACTIVE SERVICE{radarData.subscriptions.length !== 1 ? "S" : ""}.
          </p>
        </Tilt>

        {/* Metric 2: Annual Projected Cost */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              ANNUAL PROJECTED
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              <PrivacyValue>{currencySymbol}{totalAnnual.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1">/YR</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            ESTIMATED 12-MONTH RECURRING OUTFLOW.
          </p>
        </Tilt>

        {/* Metric 3: Active Subscriptions */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              DETECTED SERVICES
            </span>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-foreground z-10">
              {radarData.subscriptions.length}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            AUTOMATED RECURRENCE ENGINE.
          </p>
        </Tilt>

        {/* Metric 4: Silent Price Hikes */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit">
              PRICE HIKES FLAGGED
            </span>
            <div className={cn(
              "text-2xl md:text-3xl font-mono font-bold tracking-tighter z-10",
              hikeCount > 0 ? "text-amber-500" : "text-foreground"
            )}>
              {hikeCount}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            {hikeCount > 0 ? "UNANNOUNCED RATE INCREASES DETECTED." : "ZERO PRICE JUMPS DETECTED."}
          </p>
        </Tilt>
      </div>

      {/* 2. Silent Price Hike Banner (if any) */}
      {radarData.priceIncreases.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>SILENT SUBSCRIPTION PRICE INCREASE DETECTED</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {radarData.priceIncreases.map((hike, idx) => (
              <div key={idx} className="p-3 bg-background/80 border border-border rounded-lg text-xs space-y-1">
                <div className="font-bold text-foreground uppercase truncate">{hike.merchant}</div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono">
                  <span>WAS {currencySymbol}{hike.previousAmount.toFixed(2)}</span>
                  <span className="text-amber-500 font-bold">→ {currencySymbol}{hike.newAmount.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                  +{hike.increasePercent}% RATE INCREASE
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
              <span>ACTIVE RECURRING RADAR</span>
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono uppercase">
              INSTANT REGISTRY MATCHING & CADENCE DRIFT DETECTION.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1">
              {(["all", "monthly", "annual"] as const).map((cad) => (
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
                  {cad.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center border border-border/40 bg-card/10 space-y-2 rounded-xl">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground uppercase">NO RECURRING SUBSCRIPTIONS DETECTED FOR THIS FILTER.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSubscriptions.map((sub) => {
              const isHiked = sub.status === "price_jump" || (sub.priceChangePercent && sub.priceChangePercent > 5)
              const isManualOverride = sub.source === "user_pinned" || cadenceOverrides[sub.merchant.toUpperCase()] !== undefined
              
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubForDetails(sub)}
                  className={cn(
                    "p-4 bg-card/40 hover:bg-card/70 border border-border transition-all space-y-3 rounded-xl flex flex-col justify-between relative group cursor-pointer",
                    isHiked && "border-amber-500/40"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-foreground uppercase truncate tracking-tight">{sub.merchant}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-mono truncate">
                          {sub.categoryName || "RECURRING OVERHEAD"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Interactive Cadence Toggle Pill */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleCadence(sub.merchant, sub.cadence, e)}
                          title={`Click to switch between Monthly and Annual (currently ${sub.cadence.toUpperCase()})`}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border rounded transition-all cursor-pointer flex items-center gap-1 hover:border-foreground",
                            sub.cadence === "monthly" && "bg-secondary text-foreground border-border",
                            sub.cadence === "annual" && "bg-secondary text-foreground border-border",
                            isHiked && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                            isManualOverride && "ring-1 ring-emerald-500/40"
                          )}
                        >
                          <span>{sub.cadence.toUpperCase()}</span>
                          <RefreshCw className="h-2.5 w-2.5 opacity-50 hover:opacity-100" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">LATEST CHARGE</span>
                      <span className="text-base font-bold text-foreground font-mono">
                        <PrivacyValue>{currencySymbol}{sub.latestAmount.toFixed(2)}</PrivacyValue>
                        <span className="text-[10px] text-muted-foreground ml-1">/{sub.cadence === "annual" ? "YR" : "MO"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span>NEXT: {sub.nextExpectedDate.split("T")[0]}</span>
                    </div>
                    <span className="text-[9px] uppercase opacity-70">
                      {sub.occurrences}X LOGGED
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subscription Details & Explicit Cadence Switcher Modal */}
      {selectedSubForDetails && (
        <div 
          className="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSubForDetails(null)
          }}
        >
          <div className="w-full max-w-sm bg-[#09090b] border border-border rounded-xl shadow-2xl p-5 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-foreground" />
                <span className="font-bold uppercase">{selectedSubForDetails.merchant}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSubForDetails(null)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              {/* Cadence Selector Switcher */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">SUBSCRIPTION CADENCE</span>
                <div className="grid grid-cols-2 gap-1.5 bg-secondary/30 p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => handleToggleCadence(selectedSubForDetails.merchant, "annual")}
                    className={cn(
                      "h-8 text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1",
                      selectedSubForDetails.cadence === "monthly" 
                        ? "bg-foreground text-background" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>MONTHLY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCadence(selectedSubForDetails.merchant, "monthly")}
                    className={cn(
                      "h-8 text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1",
                      selectedSubForDetails.cadence === "annual" 
                        ? "bg-foreground text-background" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>ANNUAL</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">LATEST AMOUNT</span>
                  <span className="font-bold text-foreground">{currencySymbol}{selectedSubForDetails.latestAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">FREQUENCY</span>
                  <span className="font-bold text-foreground">{selectedSubForDetails.occurrences}x detected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">NEXT ESTIMATED CHARGE</span>
                  <span className="font-bold text-foreground">{selectedSubForDetails.nextExpectedDate.split("T")[0]}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDismiss(selectedSubForDetails.merchant)}
                className="w-full h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-lg"
              >
                EXCLUDE FROM SUBSCRIPTION RADAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
