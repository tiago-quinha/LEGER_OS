"use client"

import React, { useState, useMemo, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
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
  Plus, 
  Search, 
  RotateCcw, 
  X, 
  Radio,
  RefreshCw,
  EyeOff,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { useCycleSwipe } from "@/hooks/useCycleSwipe"
import { CycleMobileBar } from "@/components/ui/cycle-mobile-bar"
import { SwipeCycleWrapper } from "@/components/ui/swipe-cycle-wrapper"
import { detectRecurringCadence, DetectedSubscription } from "@/lib/cadence-detector"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Cycle {
  id: string
  label: string
  startDate: string
  endDate: string | null
  paycheckAmount: number
}

interface RadarPageViewProps {
  expenses: any[]
  categories: any[]
  cycles: Cycle[]
  currentCycleId: string
}

export function RadarPageView({ expenses, categories, cycles, currentCycleId }: RadarPageViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [navigationDirection, setNavigationDirection] = useState<'prev' | 'next' | null>(null)
  const { currencySymbol } = useSystem()

  const [filterCadence, setFilterCadence] = useState<"all" | "monthly" | "annual">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dismissedMerchants, setDismissedMerchants] = useState<string[]>([])
  const [cadenceOverrides, setCadenceOverrides] = useState<Record<string, "monthly" | "annual">>({})
  const [pinnedSubscriptions, setPinnedSubscriptions] = useState<any[]>([])
  const [selectedSubForDetails, setSelectedSubForDetails] = useState<DetectedSubscription | null>(null)
  
  // Pin Recurring Drawer state
  const [isPinDrawerOpen, setIsPinDrawerOpen] = useState(false)
  const [pinSearch, setPinSearch] = useState("")
  const [customMerchant, setCustomMerchant] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [customCadence, setCustomCadence] = useState<"monthly" | "annual">("monthly")

  // Find active cycle
  const currentCycle = cycles.find(c => c.id === currentCycleId) || cycles[0]
  const currentCycleIndex = cycles.findIndex(c => c.id === currentCycleId)

  // Cycle navigation
  const handleCycleSelect = (id: string, dir?: 'prev' | 'next') => {
    if (dir) setNavigationDirection(dir)
    startTransition(() => {
      router.push(`/radar?cycleId=${id}`)
    })
  }

  useCycleSwipe({
    cycles,
    currentCycleId,
    route: "/radar",
    onCycleChange: handleCycleSelect,
  })

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const storedDismissed = localStorage.getItem("leger_dismissed_subscriptions")
      if (storedDismissed) setDismissedMerchants(JSON.parse(storedDismissed))

      const storedOverrides = localStorage.getItem("leger_subscription_cadence_overrides")
      if (storedOverrides) setCadenceOverrides(JSON.parse(storedOverrides))

      const storedPinned = localStorage.getItem("leger_pinned_subscriptions")
      if (storedPinned) setPinnedSubscriptions(JSON.parse(storedPinned))
    } catch (e) {}
  }, [])

  // Cadence toggle handler
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

  // Dismiss / Exclude handler
  const handleDismiss = (merchantName: string) => {
    const updated = [...dismissedMerchants, merchantName.toUpperCase()]
    setDismissedMerchants(updated)
    try {
      localStorage.setItem("leger_dismissed_subscriptions", JSON.stringify(updated))
      toast.success(`${merchantName.toUpperCase()} EXCLUDED FROM RADAR`)
    } catch (e) {}
    setSelectedSubForDetails(null)
  }

  // Restore dismissed items
  const handleResetDismissed = () => {
    setDismissedMerchants([])
    try {
      localStorage.removeItem("leger_dismissed_subscriptions")
      toast.success("RESTORED ALL EXCLUDED SUBSCRIPTIONS")
    } catch (e) {}
  }

  // Pin custom recurring bill handler
  const handleSavePinned = (merchant: string, amount: number, cadence: "monthly" | "annual") => {
    const norm = merchant.trim().toUpperCase()
    if (!norm || isNaN(amount) || amount <= 0) {
      toast.error("PLEASE ENTER A VALID MERCHANT AND AMOUNT")
      return
    }

    // Set override and synthetic pinned entry
    const updatedOverrides = { ...cadenceOverrides, [norm]: cadence }
    setCadenceOverrides(updatedOverrides)

    const updatedPinned = [...pinnedSubscriptions.filter(p => p.merchant !== norm), {
      merchant: norm,
      amount: -Math.abs(amount),
      cadence,
      date: new Date().toISOString().split("T")[0]
    }]
    setPinnedSubscriptions(updatedPinned)

    try {
      localStorage.setItem("leger_subscription_cadence_overrides", JSON.stringify(updatedOverrides))
      localStorage.setItem("leger_pinned_subscriptions", JSON.stringify(updatedPinned))
      toast.success(`PINNED ${norm} AS ${cadence.toUpperCase()} SUBSCRIPTION`)
    } catch (e) {}

    setIsPinDrawerOpen(false)
    setCustomMerchant("")
    setCustomAmount("")
  }

  // Combine real expenses with user pinned items
  const allSyntheticExpenses = useMemo(() => {
    const pinnedExpenseObjects = pinnedSubscriptions.map((p, idx) => ({
      id: `pinned-${idx}`,
      merchant: p.merchant,
      amount: p.amount,
      date: p.date,
      raw_text: p.merchant,
      is_income: false
    }))
    return [...(expenses || []), ...pinnedExpenseObjects]
  }, [expenses, pinnedSubscriptions])

  // Run Radar Detection Engine
  const radarData = useMemo(() => {
    return detectRecurringCadence(
      allSyntheticExpenses,
      currentCycle?.startDate,
      currentCycle?.endDate || undefined,
      dismissedMerchants,
      cadenceOverrides
    )
  }, [allSyntheticExpenses, currentCycle, dismissedMerchants, cadenceOverrides])

  // Filter subscriptions by search and cadence
  const filteredSubscriptions = useMemo(() => {
    return radarData.subscriptions.filter(s => {
      const matchesCadence = filterCadence === "all" || s.cadence === filterCadence
      const matchesSearch = !searchQuery.trim() || 
        s.merchant.toUpperCase().includes(searchQuery.trim().toUpperCase()) ||
        (s.categoryName && s.categoryName.toUpperCase().includes(searchQuery.trim().toUpperCase()))
      return matchesCadence && matchesSearch
    })
  }, [radarData.subscriptions, filterCadence, searchQuery])

  // Candidate transactions to pin from statement
  const pinCandidates = useMemo(() => {
    if (!pinSearch.trim()) return []
    const q = pinSearch.trim().toUpperCase()
    const rawOutflows = (expenses || []).filter(e => {
      const amt = parseFloat(e.amount)
      return !isNaN(amt) && amt < 0 && e.is_income !== true
    })

    const seen = new Set<string>()
    return rawOutflows.filter(e => {
      const name = (e.merchant || e.raw_text || "").toUpperCase()
      if (name.includes(q) && !seen.has(name)) {
        seen.add(name)
        return true
      }
      return false
    }).slice(0, 8)
  }, [expenses, pinSearch])

  const totalMonthly = radarData.totalMonthlyCommitment
  const totalAnnual = radarData.totalAnnualCommitment
  const hikeCount = radarData.priceIncreases.length

  const monthlyCount = radarData.subscriptions.filter(s => s.cadence === "monthly").length
  const annualCount = radarData.subscriptions.filter(s => s.cadence === "annual").length

  return (
    <SwipeCycleWrapper
      cycles={cycles}
      currentCycleId={currentCycleId}
      route="/radar"
      onCycleChange={handleCycleSelect}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 md:space-y-8 pb-36 md:pb-8 w-full font-mono"
    >
      {/* 1. Header (Normalized Subpage Header) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 md:pb-6 relative border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-foreground" />
            <span>SUBSCRIPTION RADAR // COMMITMENT ENGINE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            {isPending ? (
              <Skeleton className="h-10 w-64 rounded-none" />
            ) : (
              "RECURRING RADAR"
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {dismissedMerchants.length > 0 && (
            <button
              type="button"
              onClick={handleResetDismissed}
              className="h-9 px-3 bg-secondary/40 hover:bg-secondary border border-border text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
              title="Restore dismissed subscriptions"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>RESTORE ({dismissedMerchants.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPinDrawerOpen(true)}
            className="h-9 px-4 bg-foreground text-background font-bold text-[10px] uppercase tracking-wider hover:bg-foreground/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm rounded-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>PIN RECURRING BILL</span>
          </button>
        </div>
      </header>

      {/* 2. Executive Metric Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Metric 1: Monthly Commitment */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-2 bg-card/20 border border-border relative group overflow-hidden glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={350} />
          <div className="space-y-0.5 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit block">
              MONTHLY RECURRING
            </span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter text-foreground z-10 flex items-baseline">
              <PrivacyValue>{currencySymbol}{totalMonthly.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1.5">/MO</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            FIXED OVERHEAD ACROSS {radarData.subscriptions.length} ACTIVE SERVICE{radarData.subscriptions.length !== 1 ? "S" : ""}.
          </p>
        </Tilt>

        {/* Metric 2: Annual Projected Cost */}
        <Tilt rotationFactor={6} className="p-5 md:p-6 space-y-2 bg-card/20 border border-border relative group overflow-hidden glow-card">
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={350} />
          <div className="space-y-0.5 z-10">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-dotted border-muted-foreground/30 w-fit block">
              ANNUAL PROJECTED
            </span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter text-foreground z-10 flex items-baseline">
              <PrivacyValue>{currencySymbol}{totalAnnual.toFixed(2)}</PrivacyValue>
              <span className="text-xs font-normal text-muted-foreground ml-1.5">/YR</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase z-10">
            ESTIMATED 12-MONTH RECURRING CASH OUTFLOW.
          </p>
        </Tilt>
      </section>

      {/* 3. Silent Price Hike Banner (if any) */}
      {radarData.priceIncreases.length > 0 && (
        <section className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-none space-y-2.5">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>SILENT SUBSCRIPTION PRICE INCREASE DETECTED</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {radarData.priceIncreases.map((hike, idx) => (
              <div key={idx} className="p-3 bg-background/90 border border-border/80 rounded-none text-xs space-y-1 shadow-sm">
                <div className="font-bold text-foreground uppercase truncate text-xs">{hike.merchant}</div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono">
                  <span>WAS {currencySymbol}{hike.previousAmount.toFixed(2)}</span>
                  <span className="text-amber-500 font-bold">→ {currencySymbol}{hike.newAmount.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-widest pt-1 border-t border-border/30">
                  +{hike.increasePercent}% RATE INCREASE
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Subscriptions Explorer & Filter Bar */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="SEARCH RECURRING BILLS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-secondary/20 border border-border text-xs uppercase font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 border border-border bg-card/20 p-1 text-xs font-mono">
            {(["all", "monthly", "annual"] as const).map((cad) => {
              const count = cad === "all" 
                ? radarData.subscriptions.length 
                : radarData.subscriptions.filter(s => s.cadence === cad).length

              return (
                <button
                  key={cad}
                  type="button"
                  onClick={() => setFilterCadence(cad)}
                  className={cn(
                    "px-3 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer rounded-none",
                    filterCadence === cad
                      ? "bg-secondary text-foreground border-b-2 border-b-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <span>{cad.toUpperCase()}</span>
                  <span className="ml-1.5 opacity-60">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="p-16 text-center border border-border/40 bg-card/10 space-y-3">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-xs font-bold text-muted-foreground uppercase">NO RECURRING SUBSCRIPTIONS FOUND.</p>
            <p className="text-[11px] text-muted-foreground/70 uppercase">TRY SWITCHING FILTERS OR USE "+ PIN RECURRING BILL" TO ADD ONE.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredSubscriptions.map((sub) => {
              const isHiked = sub.status === "price_jump" || (sub.priceChangePercent && sub.priceChangePercent > 5)
              const isManualOverride = sub.source === "user_pinned" || cadenceOverrides[sub.merchant.toUpperCase()] !== undefined
              
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubForDetails(sub)}
                  className={cn(
                    "p-5 bg-card/30 hover:bg-card/60 border border-border transition-all space-y-4 rounded-none flex flex-col justify-between relative group cursor-pointer",
                    isHiked && "border-amber-500/50"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-foreground uppercase truncate tracking-tight">{sub.merchant}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-mono truncate">
                          {sub.categoryName || "RECURRING COMMITMENT"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Interactive Cadence Toggle Pill */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleCadence(sub.merchant, sub.cadence, e)}
                          title={`Click to switch between Monthly and Annual (currently ${sub.cadence.toUpperCase()})`}
                          className={cn(
                            "px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border rounded-none transition-all cursor-pointer flex items-center gap-1.5 hover:border-foreground",
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

                    <div className="flex items-baseline justify-between pt-3 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">LATEST CHARGE</span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        <PrivacyValue>{currencySymbol}{sub.latestAmount.toFixed(2)}</PrivacyValue>
                        <span className="text-[10px] text-muted-foreground ml-1">/{sub.cadence === "annual" ? "YR" : "MO"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
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

      {/* 5. Subscription Details Modal */}
      {selectedSubForDetails && (
        <div 
          className="fixed inset-0 z-[100003] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSubForDetails(null)
          }}
        >
          <div className="w-full sm:max-w-md bg-[#09090b] border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 md:p-6 space-y-5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-foreground" />
                <span className="font-bold uppercase text-sm">{selectedSubForDetails.merchant}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSubForDetails(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-1">
              {/* Cadence Switcher */}
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

              <div className="space-y-2.5 pt-2 border-t border-border/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">LATEST AMOUNT</span>
                  <span className="font-bold text-foreground text-sm">{currencySymbol}{selectedSubForDetails.latestAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">TOTAL FREQUENCY</span>
                  <span className="font-bold text-foreground">{selectedSubForDetails.occurrences}x detected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">DETECTION SOURCE</span>
                  <span className="font-bold text-foreground uppercase">{selectedSubForDetails.source.replace("_", " ")}</span>
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
                className="w-full h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-lg"
              >
                EXCLUDE FROM RECURRING RADAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Native Draggable Slide-Up Drawer: Pin Recurring Bill (Rule 14) */}
      <AnimatePresence>
        {isPinDrawerOpen && (
          <div 
            className="fixed inset-0 z-[100003] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsPinDrawerOpen(false)
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-[#09090b] border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]"
            >
              {/* Drag Handle */}
              <div className="w-full flex sm:hidden justify-center py-2.5 bg-secondary/10 border-b border-border/40 shrink-0">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Drawer Header */}
              <div className="p-5 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
                  <Plus className="h-4 w-4 text-foreground" />
                  <span>PIN RECURRING BILL / SUBSCRIPTION</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinDrawerOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 md:p-6 space-y-6 overflow-y-auto">
                {/* Search From Statement */}
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    OPTION 1: PIN RECENT TRANSACTION FROM STATEMENT
                  </span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="SEARCH TRANSACTION BY MERCHANT NAME..."
                      value={pinSearch}
                      onChange={(e) => setPinSearch(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 bg-secondary/20 border border-border text-xs uppercase font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                    />
                  </div>

                  {pinCandidates.length > 0 && (
                    <div className="border border-border divide-y divide-border/40 max-h-40 overflow-y-auto bg-card/20">
                      {pinCandidates.map((c, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setCustomMerchant((c.merchant || c.raw_text || "").toUpperCase())
                            setCustomAmount(Math.abs(parseFloat(c.amount)).toFixed(2))
                            setPinSearch("")
                          }}
                          className="p-2.5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors"
                        >
                          <div className="truncate font-bold uppercase text-foreground">
                            {c.merchant || c.raw_text}
                          </div>
                          <span className="text-foreground font-mono font-bold shrink-0 ml-2">
                            {currencySymbol}{Math.abs(parseFloat(c.amount)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border/40"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-muted-foreground uppercase tracking-widest">OR ENTER DETAILS</span>
                  <div className="flex-grow border-t border-border/40"></div>
                </div>

                {/* Manual Input Form */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">SERVICE / MERCHANT NAME</label>
                    <input
                      type="text"
                      placeholder="E.G. DOMAIN RENEWAL, CLUB FEE, CAR TAX"
                      value={customMerchant}
                      onChange={(e) => setCustomMerchant(e.target.value.toUpperCase())}
                      className="w-full h-9 px-3 bg-secondary/20 border border-border text-xs uppercase font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">BILLING AMOUNT ({currencySymbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full h-9 px-3 bg-secondary/20 border border-border text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">BILLING CADENCE</label>
                      <div className="grid grid-cols-2 gap-1 bg-secondary/30 p-1 border border-border h-9">
                        <button
                          type="button"
                          onClick={() => setCustomCadence("monthly")}
                          className={cn(
                            "text-[9px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center",
                            customCadence === "monthly" 
                              ? "bg-foreground text-background" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          MONTHLY
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomCadence("annual")}
                          className={cn(
                            "text-[9px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center",
                            customCadence === "annual" 
                              ? "bg-foreground text-background" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          ANNUAL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="pt-4 border-t border-border/40 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePinned(customMerchant, parseFloat(customAmount), customCadence)}
                    className="flex-1 h-10 bg-foreground text-background font-bold uppercase tracking-wider text-xs hover:bg-foreground/90 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>PIN TO RADAR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPinDrawerOpen(false)}
                    className="px-5 h-10 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer border border-border"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile sticky cycle bar */}
      <CycleMobileBar
        cycles={cycles}
        currentCycleId={currentCycleId}
        route="/radar"
        onCycleChange={handleCycleSelect}
      />
    </SwipeCycleWrapper>
  )
}
