"use client"

import React, { useState, useMemo, useEffect, useTransition } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Area as RechartsArea, AreaChart as RechartsAreaChart, CartesianGrid, ReferenceLine } from "recharts"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const DashboardChart = dynamic(() => import("@/components/DashboardChart").then(mod => mod.DashboardChart), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] md:h-[320px] flex flex-col gap-4 p-4 border border-border ledger-border bg-card/20 rounded-lg">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex-1 flex gap-2 items-end justify-between px-2 pt-4">
        <Skeleton className="h-[25%] w-[8%] rounded-sm" />
        <Skeleton className="h-[45%] w-[8%] rounded-sm animate-pulse [animation-delay:150ms]" />
        <Skeleton className="h-[35%] w-[8%] rounded-sm animate-pulse [animation-delay:300ms]" />
        <Skeleton className="h-[80%] w-[8%] rounded-sm animate-pulse [animation-delay:450ms]" />
        <Skeleton className="h-[55%] w-[8%] rounded-sm animate-pulse [animation-delay:600ms]" />
        <Skeleton className="h-[65%] w-[8%] rounded-sm animate-pulse [animation-delay:750ms]" />
        <Skeleton className="h-[40%] w-[8%] rounded-sm animate-pulse [animation-delay:900ms]" />
        <Skeleton className="h-[70%] w-[8%] rounded-sm animate-pulse [animation-delay:1050ms]" />
        <Skeleton className="h-[95%] w-[8%] rounded-sm animate-pulse [animation-delay:1200ms]" />
      </div>
    </div>
  )
})
import { Button } from "@/components/ui/button"
import { ProLockOverlay } from "@/components/ProLockOverlay"
import { Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight, Banknote, ChevronLeft, CalendarDays, ChevronRight, Landmark, Target, AlertTriangle, CheckCircle2, Zap, Brain, Sparkles, ChevronDown, Loader2, CalendarRange, CreditCard, Tag, Sliders, Smartphone, Shield, Cpu, LayoutDashboard, PiggyBank, Upload, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { NumberTicker } from "@/components/ui/number-ticker"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { useSystem } from "@/lib/SystemContext"
import { CycleMobileBar } from "@/components/ui/cycle-mobile-bar"
import { useCycleSwipe } from "@/hooks/useCycleSwipe"
import { SwipeCycleWrapper } from "@/components/ui/swipe-cycle-wrapper"
import DashboardLoading from "@/app/loading"

import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { AnimatedList } from "@/components/unlumen-ui/animated-list"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { FloatingTooltipTrigger } from "@/components/unlumen-ui/floating-tooltip"

interface CurvePoint {
  inflow: number
  outflow: number
}

import { detectRecurringCadence } from "@/lib/cadence-detector"

function simulateExpertDailyProjection(
  pastExpenses: any[],
  currentExpenses: any[],
  currentCycle: any,
  today: Date,
  daysElapsed: number,
  totalDaysInCycle: number,
  overrides: any[] = [],
  decayRate: number = 0.12
) {
  // Use high-precision Automated Cadence Engine for recurring subscriptions & fixed bills
  const cadenceResult = detectRecurringCadence(pastExpenses, currentCycle?.startDate, currentCycle?.endDate);
  const recurringMerchants = cadenceResult.subscriptions.map(s => ({
    merchant: s.normalizedMerchant,
    amount: s.latestAmount,
    expectedDay: s.expectedDayOfMonth || 15
  }));
  const recurringNames = new Set(cadenceResult.subscriptions.map(s => s.normalizedMerchant));

  const dowSpend = [1, 1, 1, 1, 1, 1, 1]
  pastExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && !recurringNames.has((e.merchant || "").trim().toUpperCase())) {
      const dow = new Date(e.date).getDay()
      dowSpend[dow] += Math.abs(amt)
    }
  })
  const totalDow = dowSpend.reduce((a, b) => a + b, 0)
  const dowWeights = dowSpend.map(s => (s / totalDow) * 7)

  const currentActualOut = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
  
  const currentActualIn = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) > 0)
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)

  const currentRecurringSpent = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0 && recurringNames.has((e.merchant || "").trim().toUpperCase()))
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)

  const currentAnomaliesSpent = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0 && e.is_anomaly)
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
    
  const effectiveElapsed = Math.max(1, Math.min(daysElapsed, totalDaysInCycle))
  const todayTime = today.getTime()

  // Recency-weighted daily variable burn rate (adapts daily and expense-by-expense with half-life decay)
  let weightedSpend = 0
  let totalWeight = 0
  currentExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && new Date(e.date) <= today && !recurringNames.has((e.merchant || "").trim().toUpperCase()) && !e.is_anomaly) {
      const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
      if (daysAgo <= effectiveElapsed) {
        const w = Math.exp(-decayRate * daysAgo) // Lambda decayRate = user configured decay weighting
        weightedSpend += Math.abs(amt) * w
        totalWeight += w
      }
    }
  })
  const unweightedVariableSpend = Math.max(0, currentActualOut - currentRecurringSpent - currentAnomaliesSpent)
  const standardDailyBurn = unweightedVariableSpend / effectiveElapsed
  const currentDailyVariableBurn = totalWeight > 0 ? (weightedSpend / totalWeight) : standardDailyBurn

  const pastVariableTotal = pastExpenses
    .filter((e: any) => parseFloat(e.amount) < 0 && !recurringNames.has((e.merchant || "").trim().toUpperCase()) && !e.is_anomaly)
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
  const histDailyVariableBurn = pastExpenses.length > 0 ? (pastVariableTotal / Math.max(1, pastExpenses.length)) * 1.5 : currentDailyVariableBurn || 20

  // Heavily favor current cycle velocity (starts at 65% weight on day 1, approaching 100% by cycle end)
  const alpha = Math.min(1.0, 0.65 + 0.35 * (effectiveElapsed / totalDaysInCycle))
  const blendedDailyBurn = alpha * currentDailyVariableBurn + (1 - alpha) * histDailyVariableBurn

  let dailyBurnAdjustment = 0
  let totalFixedDelta = 0
  if (overrides && overrides.length > 0) {
    overrides.forEach((ov: any) => {
      if (ov.fixedDelta) {
        totalFixedDelta += parseFloat(ov.fixedDelta) || 0
      }
      if (ov.multiplier !== undefined && ov.multiplier !== null && ov.multiplier !== 1.0) {
        let catWeightedSpend = 0
        let catTotalWeight = 0
        currentExpenses.forEach((e: any) => {
          const amt = parseFloat(e.amount)
          if (amt < 0 && new Date(e.date) <= today && (ov.categoryId ? e.category_id?.toString() === ov.categoryId?.toString() : true)) {
            const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
            if (daysAgo <= effectiveElapsed) {
              const w = Math.exp(-decayRate * daysAgo)
              catWeightedSpend += Math.abs(amt) * w
              catTotalWeight += w
            }
          }
        })
        const catSpentCurrent = currentExpenses
          .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0 && (ov.categoryId ? e.category_id?.toString() === ov.categoryId?.toString() : true))
          .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
        const catDailyCurrent = catTotalWeight > 0 ? (catWeightedSpend / catTotalWeight) : (catSpentCurrent / effectiveElapsed)

        const catSpentPast = pastExpenses
          .filter((e: any) => parseFloat(e.amount) < 0 && (ov.categoryId ? e.category_id?.toString() === ov.categoryId?.toString() : true))
          .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
        const catDailyPast = pastExpenses.length > 0 ? (catSpentPast / Math.max(1, pastExpenses.length)) * 1.5 : catDailyCurrent || 5
        const catBlendedBurn = alpha * catDailyCurrent + (1 - alpha) * catDailyPast
        
        dailyBurnAdjustment += catBlendedBurn * (ov.multiplier - 1.0)
      }
    })
  }

  const dailySpend = new Array(totalDaysInCycle + 1).fill(0)
  const dailySpendOptimistic = new Array(totalDaysInCycle + 1).fill(0)
  const dailySpendPessimistic = new Array(totalDaysInCycle + 1).fill(0)
  const dailyInflow = new Array(totalDaysInCycle + 1).fill(0)
  const startDate = new Date(currentCycle.startDate)
  const remainingDays = Math.max(1, totalDaysInCycle - daysElapsed)
  const dailyFixedDelta = totalFixedDelta / remainingDays

  for (let i = 0; i <= totalDaysInCycle; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const isSameDay = d.toDateString() === today.toDateString()
    const isPastDay = d < today && !isSameDay

    if (isPastDay || isSameDay) {
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)
      const actualOut = currentExpenses
        .filter((e: any) => new Date(e.date) <= dEnd && parseFloat(e.amount) < 0)
        .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
      dailySpend[i] = actualOut
      dailySpendOptimistic[i] = actualOut
      dailySpendPessimistic[i] = actualOut
      
      dailyInflow[i] = currentExpenses
        .filter((e: any) => new Date(e.date) <= dEnd && parseFloat(e.amount) > 0)
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)
    } else {
      const prevSpend = i > 0 ? dailySpend[i - 1] : currentActualOut
      const prevSpendOpt = i > 0 ? dailySpendOptimistic[i - 1] : currentActualOut
      const prevSpendPes = i > 0 ? dailySpendPessimistic[i - 1] : currentActualOut
      const prevInflow = i > 0 ? dailyInflow[i - 1] : currentActualIn

      let billsDueToday = 0
      recurringMerchants.forEach(rm => {
        if (rm.expectedDay === i && rm.expectedDay > daysElapsed) {
          billsDueToday += rm.amount
        }
      })

      const dow = d.getDay()
      const variableSpendToday = Math.max(0, (blendedDailyBurn + dailyBurnAdjustment) * (dowWeights[dow] || 1.0) + dailyFixedDelta)
      
      dailySpend[i] = prevSpend + billsDueToday + variableSpendToday
      dailySpendOptimistic[i] = prevSpendOpt + billsDueToday + (variableSpendToday * 0.8)
      dailySpendPessimistic[i] = prevSpendPes + billsDueToday + (variableSpendToday * 1.2)
      dailyInflow[i] = prevInflow
    }
  }

  return {
    dailySpend,
    dailySpendOptimistic,
    dailySpendPessimistic,
    dailyInflow,
    projectedTotalOut: dailySpend[totalDaysInCycle] || currentActualOut,
    projectedTotalIn: dailyInflow[totalDaysInCycle] || currentActualIn
  }
}

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
  allPastExpenses?: any[]
  paycheckKeyword?: string
  targetMonthlyIncome?: number
  targetMonthlySpend?: number
}

export function DashboardView({ 
  expenses = [], 
  categories = [], 
  budgets = [], 
  balances = [], 
  cycles = [], 
  currentCycleId, 
  injectedStartBalance = 0, 
  previousExpenses = [], 
  previousStartBalance = 0,
  allPastExpenses = [],
  paycheckKeyword,
  targetMonthlyIncome = 2500,
  targetMonthlySpend = 1500
}: DashboardViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [navigationDirection, setNavigationDirection] = useState<'prev' | 'next' | null>(null)
  const { setAuditPanelOpen, setActiveTransactionId, currencySymbol, language, decayWeight, isPro, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly, profile, user, refreshProfile } = useSystem()
  
  const currentCycle = cycles.find(c => c.id === currentCycleId) || cycles[0]

  // DATA CALCULATIONS (memoized to avoid re-iterating expenses on every render)
  const { totalOut, totalAnomalies, cleanTotalOut, totalIn, netChange, cycleEndBalance, netFlow } = useMemo(() => {
    let _totalOut = 0, _totalAnomalies = 0, _totalIn = 0, _netChange = 0
    for (const exp of expenses) {
      const amt = parseFloat(exp.amount) || 0
      _netChange += amt
      if (amt < 0) {
        const absAmt = Math.abs(amt)
        _totalOut += absAmt
        if (exp.is_anomaly) _totalAnomalies += absAmt
      } else if (amt > 0) {
        _totalIn += amt
      }
    }
    return {
      totalOut: _totalOut,
      totalAnomalies: _totalAnomalies,
      cleanTotalOut: _totalOut - _totalAnomalies,
      totalIn: _totalIn,
      netChange: _netChange,
      cycleEndBalance: injectedStartBalance + _netChange,
      netFlow: _totalIn - _totalOut,
    }
  }, [expenses, injectedStartBalance])

  const daysElapsed = useMemo(() => {
    if (!currentCycle) return 30
    const start = new Date(currentCycle.startDate)
    const end = currentCycle.endDate ? new Date(currentCycle.endDate) : new Date()
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }, [currentCycle])

  const totalDaysInCycle = useMemo(() => {
    if (!currentCycle) return 30
    if (!currentCycle.endDate) return Math.max(30, daysElapsed)
    const start = new Date(currentCycle.startDate)
    const end = new Date(currentCycle.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) - 1)
  }, [currentCycle, daysElapsed])
  const startDate = new Date(currentCycle.startDate)
  const today = new Date()

  const currentIndex = cycles.findIndex(c => c.id === currentCycleId)
  const isCurrentCycle = currentIndex === 0 || !currentCycle.endDate

  const [overrides, setOverrides] = useState<any[]>([])
  useEffect(() => {
    const loadOverrides = () => {
      try {
        if (profile && profile.projection_overrides) {
          setOverrides(profile.projection_overrides)
        } else {
          const stored = localStorage.getItem("leger_cycle_overrides")
          if (stored) setOverrides(JSON.parse(stored))
          else setOverrides([])
        }
      } catch (e) {}
    }
    loadOverrides()
    window.addEventListener("leger_overrides_updated", loadOverrides)
    return () => window.removeEventListener("leger_overrides_updated", loadOverrides)
  }, [currentCycleId, profile])

  // Predictive Expert Data Analyst Daily Simulation
  const expertProjection = useMemo(() => {
    const past = allPastExpenses || previousExpenses || []
    return simulateExpertDailyProjection(past, expenses, currentCycle, today, daysElapsed, totalDaysInCycle, overrides, decayWeight || 0.12)
  }, [allPastExpenses, previousExpenses, expenses, currentCycle, today, daysElapsed, totalDaysInCycle, overrides, decayWeight])

  const projectedTotalOut = useMemo(() => {
    if (!isCurrentCycle) return totalOut
    return expertProjection.projectedTotalOut
  }, [expertProjection, totalOut, isCurrentCycle])

  const projectedTotalIn = useMemo(() => {
    if (!isCurrentCycle) return totalIn
    return expertProjection.projectedTotalIn
  }, [expertProjection, totalIn, isCurrentCycle])

  const onTrack = totalIn > 0 ? projectedTotalOut <= totalIn : true

  // Velocity Calculation
  const timeProgress = Math.min(1, daysElapsed / totalDaysInCycle)
  const baseIncome = currentCycle.paycheckAmount > 0 ? currentCycle.paycheckAmount : 500
  const spendProgress = baseIncome > 0 ? totalOut / baseIncome : 0
  const velocity = timeProgress > 0 ? spendProgress / timeProgress : 0
  const estimatedFinalBalance = isCurrentCycle 
    ? (injectedStartBalance + projectedTotalIn - projectedTotalOut) 
    : cycleEndBalance

  const inflowPercent = (totalIn / Math.max(1, targetMonthlyIncome)) * 100
  const outflowPercent = (totalOut / Math.max(1, targetMonthlySpend)) * 100
  const previousCycleEndBalance = useMemo(() => {
    if (cycles.length <= 1 || currentIndex >= cycles.length - 1) {
      return injectedStartBalance
    }
    const prevNetChange = previousExpenses.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)
    return previousStartBalance + prevNetChange
  }, [cycles, currentIndex, injectedStartBalance, previousStartBalance, previousExpenses])

  const delta = cycleEndBalance - previousCycleEndBalance

  const handleCycleSelect = (newCycleId: string) => {
    const targetIdx = cycles.findIndex(c => c.id === newCycleId)
    if (targetIdx !== -1 && targetIdx !== currentIndex) {
      setNavigationDirection(targetIdx > currentIndex ? 'prev' : 'next')
    }
    startTransition(() => {
      router.replace(`/?cycleId=${newCycleId}`, { scroll: false })
    })
  }

  const navigateCycle = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (cycles[nextIndex]) {
      handleCycleSelect(cycles[nextIndex].id)
    }
  }

  useCycleSwipe({
    cycles,
    currentCycleId,
    route: "/",
    onCycleChange: handleCycleSelect,
  })

  const openAudit = (id: string) => {
    setActiveTransactionId(id)
    setAuditPanelOpen(true)
  }

  const [activeTab, setActiveTab] = useState<'burn' | 'liquidity'>('liquidity')
  const [viewMode, setViewMode] = useState<'graph' | 'calendar'>('graph')
  const [showGraphLock, setShowGraphLock] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [manualCategory, setManualCategory] = useState<string>("global")
  const [manualPercent, setManualPercent] = useState<string>("")
  const [manualDirection, setManualDirection] = useState<string>("decrease")
  const [manualReason, setManualReason] = useState<string>("")

  const saveOverrides = async (updatedList: any[]) => {
    localStorage.setItem("leger_cycle_overrides", JSON.stringify(updatedList))
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ projection_overrides: updatedList })
          .eq("id", user.id)
        await refreshProfile()
      } catch (err) {
        console.error("Failed to sync overrides:", err)
      }
    }
    window.dispatchEvent(new Event("leger_overrides_updated"))
  }

  const clearAllOverrides = () => {
    saveOverrides([])
  }

  const deleteOverride = (targetIndexOrId: number | string) => {
    const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
    const updated = existing.filter((o: any, idx: number) => {
      if (typeof targetIndexOrId === "number") {
        return idx !== targetIndexOrId
      }
      if (o.id && typeof targetIndexOrId === "string" && !targetIndexOrId.startsWith("cat_")) {
        return o.id !== targetIndexOrId
      }
      const num = parseInt(String(targetIndexOrId), 10)
      if (!isNaN(num) && String(num) === String(targetIndexOrId)) {
        return idx !== num
      }
      return o.categoryId !== targetIndexOrId
    })
    saveOverrides(updated)
  }

  const handleAddManualOverride = (e: React.FormEvent) => {
    e.preventDefault()
    let multiplier: number | null = 1.0
    let fixedDelta: number | null = null
    const val = parseFloat(manualPercent)

    if (manualDirection === "decrease") {
      if (isNaN(val) || val <= 0) return
      multiplier = Math.max(0, 1 - val / 100)
    } else if (manualDirection === "increase") {
      if (isNaN(val) || val <= 0) return
      multiplier = 1 + val / 100
    } else if (manualDirection === "fixed_reduction") {
      if (isNaN(val) || val <= 0) return
      fixedDelta = -Math.abs(val)
      multiplier = 1.0
    } else if (manualDirection === "fixed_increase") {
      if (isNaN(val) || val <= 0) return
      fixedDelta = Math.abs(val)
      multiplier = 1.0
    } else if (manualDirection === "freeze_category") {
      multiplier = 0.0
    }

    let categoryName = "Global"
    let categoryId: string | null = null

    if (manualCategory !== "global") {
      const cat = categories.find(c => c.id.toString() === manualCategory.toString())
      if (cat) {
        categoryId = cat.id.toString()
        categoryName = cat.name
      }
    }

    const newOverride = {
      id: `ov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      categoryId,
      categoryName,
      multiplier,
      fixedDelta,
      reason: manualReason.trim() || (fixedDelta !== null ? (fixedDelta < 0 ? "Fixed Spend Reduction" : "Fixed Extra Spend") : manualDirection === "freeze_category" ? "Freeze Category Spend" : "Manual adjustment")
    }

    const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
    const updated = [...existing, newOverride]

    saveOverrides(updated)

    setManualPercent("")
    setManualReason("")
  }

  const [selectedCategoryForGraph, setSelectedCategoryForGraph] = useState<any | null>(null)
  const [budgetGraphOpen, setBudgetGraphOpen] = useState(false)

  const categoryGraphData = useMemo(() => {
    if (!selectedCategoryForGraph) return []
    const dataPoints: any[] = []
    let cumulativeSpend = 0
    let cumulativeInflow = 0
    
    const cycleStart = new Date(currentCycle.startDate)
    for (let i = 0; i <= daysElapsed; i++) {
      const date = new Date(cycleStart)
      date.setDate(date.getDate() + i)
      const dateLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      
      const dateEnd = new Date(date)
      dateEnd.setHours(23, 59, 59, 999)
      
      const dayTx = expenses.filter((e: any) => 
        e.category_id?.toString() === selectedCategoryForGraph.id?.toString() &&
        new Date(e.date) <= dateEnd && 
        new Date(e.date) > (i > 0 ? new Date(new Date(cycleStart).setDate(new Date(cycleStart).getDate() + i - 1)) : new Date(0))
      )
      
      const dayOut = dayTx.filter((e: any) => parseFloat(e.amount) < 0).reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
      const dayIn = dayTx.filter((e: any) => parseFloat(e.amount) > 0).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)
      cumulativeSpend += dayOut
      cumulativeInflow += dayIn
      
      dataPoints.push({
        day: i,
        dateLabel,
        spend: cumulativeSpend,
        netProfitLoss: cumulativeInflow - cumulativeSpend,
        limit: selectedCategoryForGraph.limit
      })
    }
    return dataPoints
  }, [selectedCategoryForGraph, expenses, currentCycle.startDate, daysElapsed])

  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryForGraph) return []
    return expenses
      .filter((exp: any) => exp.category_id?.toString() === selectedCategoryForGraph.id?.toString())
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedCategoryForGraph, expenses])

  const zeroOffset = useMemo(() => {
    if (categoryGraphData.length === 0) return 0.5
    const values = categoryGraphData.map(d => d.netProfitLoss)
    const maxVal = Math.max(...values)
    const minVal = Math.min(...values)
    
    if (maxVal === minVal) return 0.5
    if (maxVal <= 0) return 0
    if (minVal >= 0) return 1
    
    return maxVal / (maxVal - minVal)
  }, [categoryGraphData])

  useEffect(() => {
    // For non-PRO users, always lock the graph once transactions exist
    if (!isPro) {
      setShowGraphLock(true)
      const dismissedUntil = localStorage.getItem('leger_pro_graph_dismissed_until')
      if (dismissedUntil) {
        const time = parseInt(dismissedUntil, 10)
        if (!isNaN(time) && Date.now() < time) {
          setViewMode('calendar')
        }
      }
    } else {
      setShowGraphLock(false)
    }
  }, [isPro])

  // Group expenses by date for calendar view
  const expensesByDate = useMemo(() => expenses.reduce((acc: any, exp) => {
    const date = new Date(exp.date).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(exp)
    return acc
  }, {}), [expenses])

  // GENERATE HYBRID DATA
  const hybridData = useMemo(() => Array.from({ length: totalDaysInCycle + 1 }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

    const isSameDay = date.toDateString() === today.toDateString()
    const isPastDay = date < today && !isSameDay

    let actualSpend: number | null = null
    let actualBalance: number | null = null
    if (isPastDay || isSameDay) {
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
    let optimisticSpend = null
    let optimisticBalance = null
    let pessimisticSpend = null
    let pessimisticBalance = null
    
    if (isCurrentCycle) {
        if (isPastDay) {
            projectionSpend = null
            projectionBalance = null
            optimisticSpend = null
            optimisticBalance = null
            pessimisticSpend = null
            pessimisticBalance = null
        } else if (isSameDay) {
            projectionSpend = actualSpend
            projectionBalance = actualBalance
            optimisticSpend = actualSpend
            optimisticBalance = actualBalance
            pessimisticSpend = actualSpend
            pessimisticBalance = actualBalance
        } else {
            projectionSpend = expertProjection.dailySpend[i]
            projectionBalance = injectedStartBalance + expertProjection.dailyInflow[i] - projectionSpend
            optimisticSpend = expertProjection.dailySpendOptimistic[i]
            optimisticBalance = injectedStartBalance + expertProjection.dailyInflow[i] - optimisticSpend
            pessimisticSpend = expertProjection.dailySpendPessimistic[i]
            pessimisticBalance = injectedStartBalance + expertProjection.dailyInflow[i] - pessimisticSpend
        }
    }

    return {
      day: i,
      dateLabel,
      date: date.toISOString(),
      actualSpend,
      actualBalance,
      theoretical,
      projectionSpend,
      projectionBalance,
      optimisticSpend,
      optimisticBalance,
      pessimisticSpend,
      pessimisticBalance
    }
  }), [totalDaysInCycle, startDate, today, expenses, injectedStartBalance, totalIn, isCurrentCycle, expertProjection])

  const spendingByCategory = useMemo(() => categories.map(cat => {
    const spent = expenses
      .filter(exp => exp.category_id === cat.id && parseFloat(exp.amount) < 0)
      .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)
    
    // Net pocket balance for bidirectional pocket (inflows > 0, outflows < 0)
    const netBalance = expenses
      .filter(exp => exp.category_id === cat.id)
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
    
    // Find budget for this category
    const budget = budgets.find(b => b.category_id?.toString() === cat.id.toString())
    const limit = budget ? parseFloat(budget.amount) : 0

    // Previous spend simulation
    const prevSpentAtPoint = previousExpenses
        .filter(e => e.category_id === cat.id && parseFloat(e.amount) < 0)
        .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)
    
    return { 
        id: cat.id,
        name: cat.name, 
        value: spent,
        netBalance,
        limit, 
        color: cat.color || "#09090B",
        prevValue: prevSpentAtPoint 
    }
  }).filter(c => c.value > 0 || c.limit > 0 || c.netBalance !== 0).sort((a, b) => b.value - a.value), [categories, expenses, budgets, previousExpenses])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const topExpenses = expenses
        .filter(e => parseFloat(e.amount) < 0)
        .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))
        .slice(0, 10)
        .map(e => ({ date: e.date, merchant: e.merchant, amount: e.amount, category_id: e.category_id }));

      const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(e => ({ date: e.date, merchant: e.merchant, amount: e.amount, category_id: e.category_id }));

      (window as any).__leger_cycle_telemetry = {
        totalIn,
        totalOut,
        currentBalance: cycleEndBalance,
        velocity,
        daysElapsed,
        spendingLimit: targetMonthlySpend,
        categories: spendingByCategory.filter(c => c.value > 0).map(c => ({ name: c.name, value: c.value })),
        netDelta: totalIn - totalOut,
        topExpenses,
        recentExpenses,
        projectedSurplus: projectedTotalIn - projectedTotalOut,
        projectedEndBalance: estimatedFinalBalance
      };
      window.dispatchEvent(new Event("leger_telemetry_updated"));
    }
  }, [totalIn, totalOut, cycleEndBalance, velocity, daysElapsed, targetMonthlySpend, spendingByCategory, expenses, projectedTotalIn, projectedTotalOut, estimatedFinalBalance])

  const systemLogs = useMemo(() => {
    const logs = []
    let todayStr = new Date().toISOString().split('T')[0]
    let cycleStartStr = todayStr
    
    try {
      if (currentCycle?.startDate) {
        const d = new Date(currentCycle.startDate)
        if (!isNaN(d.getTime())) {
          cycleStartStr = d.toISOString().split('T')[0]
        }
      }
    } catch (e) {
      console.error("Invalid cycle start date", e)
    }
    
    // Core status
    logs.push({ date: cycleStartStr, type: "success", text: "System connection established" })
    logs.push({ date: cycleStartStr, type: "info", text: "Active cycle transactions synchronized" })
    
    // Velocity Alert
    if (velocity > 1.1) {
      logs.push({ date: todayStr, type: "warning", text: `Warning: Spending velocity exceeds threshold: ${velocity.toFixed(2)}x` })
    } else {
      logs.push({ date: todayStr, type: "info", text: `Normal: Spending velocity is stable at ${velocity.toFixed(2)}x` })
    }

    // Budget Limits
    spendingByCategory.forEach(cat => {
      if (cat.limit > 0) {
        const spent = cat.value
        const ratio = spent / cat.limit
        if (ratio >= 1.0) {
          logs.push({ date: todayStr, type: "error", text: `Budget Overrun: Exceeded limit for '${cat.name}'. Spent: ${currencySymbol}${spent.toFixed(2)} / ${currencySymbol}${cat.limit.toFixed(2)}.` })
        } else if (ratio >= 0.8) {
          logs.push({ date: todayStr, type: "warning", text: `Budget Warning: '${cat.name}' is ${(ratio * 100).toFixed(0)}% depleted. Spent: ${currencySymbol}${spent.toFixed(2)} / ${currencySymbol}${cat.limit.toFixed(2)}.` })
        }
      }
    })

    // Large transactions alert
    const largeExpenses = expenses.filter(e => parseFloat(e.amount.toString()) < -150)
    largeExpenses.forEach(tx => {
      let txDateStr = todayStr
      try {
        if (tx.date) {
          const d = new Date(tx.date)
          if (!isNaN(d.getTime())) {
            txDateStr = d.toISOString().split('T')[0]
          }
        }
      } catch (e) {
        console.error("Invalid transaction date", e)
      }
      logs.push({ date: txDateStr, type: "warning", text: `Alert: Large debit of ${currencySymbol}${Math.abs(parseFloat(tx.amount.toString())).toFixed(2)} recorded at '${tx.merchant}'.` })
    })

    // End-of-cycle projection warning
    if (estimatedFinalBalance < 0) {
      logs.push({ date: todayStr, type: "error", text: `Alert: End of cycle projection predicts deficit: ${currencySymbol}${estimatedFinalBalance.toFixed(2)}.` })
    } else if (estimatedFinalBalance < injectedStartBalance * 0.1) {
      logs.push({ date: todayStr, type: "warning", text: `Alert: End-cycle projection is low: ${currencySymbol}${estimatedFinalBalance.toFixed(2)}.` })
    }

    return logs
  }, [currentCycle, velocity, spendingByCategory, expenses, estimatedFinalBalance, injectedStartBalance, currencySymbol])

  const activeBudgets = spendingByCategory.filter(c => c.limit > 0)

  return (
    <SwipeCycleWrapper
      cycles={cycles}
      currentCycleId={currentCycleId}
      route="/"
      onCycleChange={handleCycleSelect}
    >
      {isPending ? (
        <DashboardLoading />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 pb-36 md:pb-8 w-full"
        >
        {/* 1. Header */}
      <header className="flex items-center justify-between gap-6 pb-4 md:pb-6 relative border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Active Paycheck Cycle</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            {isPending ? (
              <Skeleton className="h-10 w-64 rounded-none" />
            ) : (
              currentCycle.label.replace('Cycle: ', '')
            )}
          </h1>
        </div>
      </header>

      {/* Core Financial Path */}
          
          {/* 2. Trajectories */}
          <section className="space-y-6 pt-2 sm:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full">
                <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <button 
                    onClick={() => setActiveTab('liquidity')}
                    className={cn(
                      "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest transition-all cursor-pointer",
                      activeTab === 'liquidity' ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                  >
                    Liquidity
                  </button>
                  <button 
                    onClick={() => setActiveTab('burn')}
                    className={cn(
                      "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest transition-all border-l border-border cursor-pointer",
                      activeTab === 'burn' ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                  >
                    Burn
                  </button>
                </div>

                <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <button 
                    onClick={() => {
                      setViewMode('graph')
                      localStorage.removeItem('leger_pro_graph_dismissed_until')
                    }}
                    className={cn(
                      "px-4 py-2 transition-all cursor-pointer",
                      viewMode === 'graph' ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                    aria-label="Graph view"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "px-4 py-2 transition-all border-l border-border cursor-pointer",
                      viewMode === 'calendar' ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                    aria-label="Calendar view"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cycle Navigation Chevrons (Desktop only; on mobile, sticky bottom bar is used) */}
                <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <button 
                    onClick={() => navigateCycle('prev')} 
                    disabled={isPending || currentIndex >= cycles.length - 1} 
                    className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 border-r border-border cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous paycheck cycle"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
                  </button>
                  <button 
                    onClick={() => navigateCycle('next')} 
                    disabled={isPending || currentIndex <= 0} 
                    className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next paycheck cycle"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Full-width statistics bar matching graph width */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-2 px-4 border border-border ledger-border bg-card text-[10px] font-mono w-full">
               <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                 <div className="flex items-center gap-1.5">
                   <span className={cn("h-2 w-2 rounded-full shrink-0", delta >= 0 ? "bg-emerald-500" : "bg-destructive")} />
                   <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">Net Cash Flow:</span>
                 </div>
                 <span className={cn("font-bold whitespace-nowrap", delta >= 0 ? "text-emerald-500" : "text-destructive")}>
                   <PrivacyValue>{delta >= 0 ? "+" : ""}{currencySymbol}{delta.toFixed(2)}</PrivacyValue>
                 </span>
               </div>
               <span className="hidden sm:inline text-muted-foreground/30 font-light select-none">|</span>
               <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto border-t border-border/30 pt-2 sm:pt-0 sm:border-0">
                  <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">Daily Burn:</span>
                  <span className="font-bold text-foreground whitespace-nowrap">
                    <PrivacyValue>{currencySymbol}{(cleanTotalOut / Math.max(1, daysElapsed)).toFixed(2)}/d</PrivacyValue>
                  </span>
               </div>
            </div>
            
            <div className="min-h-[300px] md:min-h-[400px] h-fit w-full border border-border ledger-border p-4 md:p-10 bg-card/40 relative overflow-hidden flex flex-col justify-center">
              {viewMode === 'graph' ? (
                <div className="relative w-full h-full">
                  <DashboardChart 
                    hybridData={hybridData} 
                    activeTab={activeTab} 
                    onDayClick={(dateStr) => {
                      setSelectedDate(new Date(dateStr))
                      setModalOpen(true)
                    }}
                    isPro={isPro}
                  />

                  {/* Empty State Overlay when no transactions are recorded yet */}
                  {expenses.length === 0 && (
                    <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                      <div className="max-w-md w-full space-y-4">
                        <div className="w-11 h-11 rounded-none bg-secondary/40 border border-border flex items-center justify-center mx-auto text-foreground shadow-sm">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-foreground">
                            Projection Engine Calibrated
                          </h3>
                          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                            You have no transactions in your ledger yet. Ingest your first bank statement or record an entry to generate your daily burn forecast.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                          <Button
                            type="button"
                            onClick={() => router.push('/expenses')}
                            className="w-full sm:w-auto h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 px-5 shadow-sm"
                          >
                            <Upload className="h-4 w-4" /> Upload Statement
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedDate(new Date())
                              setModalOpen(true)
                            }}
                            className="w-full sm:w-auto h-11 rounded-none border-border bg-secondary/30 hover:bg-secondary text-foreground font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 px-4"
                          >
                            <Plus className="h-4 w-4" /> Add Expense
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isPro && showGraphLock && expenses.length > 0 && (
                    <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                      <div className="max-w-md w-full space-y-3">
                        <ProLockOverlay 
                          title="ADVANCED PROJECTION ENGINE"
                          description="Upgrade to LEGER_OS PRO to unlock daily recency-decay cash flow forecasting, Monte Carlo simulation paths, and custom AI overrides."
                          className="w-full rounded-none shadow-2xl border border-emerald-500/30"
                        />
                        <Button 
                          type="button"
                          onClick={() => {
                            setViewMode('calendar')
                            localStorage.setItem('leger_pro_graph_dismissed_until', (Date.now() + 3 * 60 * 60 * 1000).toString())
                          }}
                          variant="outline"
                          className="w-full h-8 rounded-none border-border hover:bg-secondary/40 text-muted-foreground font-mono text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Dismiss (Calendar View)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full mt-6">
                  <div className="w-full grid grid-cols-7 border-t border-l border-border ledger-border bg-card/20">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="p-2 border-r border-b border-border text-center bg-secondary/20 font-mono font-bold text-[9px] uppercase tracking-wider text-muted-foreground">{day}</div>
                    ))}
                    {Array.from({ length: totalDaysInCycle + 1 }, (_, i) => {
                      const date = new Date(startDate)
                      date.setDate(date.getDate() + i)
                      const dateStr = date.toDateString()
                      const dayExpenses = expensesByDate[dateStr] || []
                      const dayOut = dayExpenses.filter((e: any) => parseFloat(e.amount) < 0).reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
                      const dayIn = dayExpenses.filter((e: any) => parseFloat(e.amount) > 0).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)
                      const netDay = dayIn - dayOut
                      
                      const isFirst = i === 0
                      const dayOfWeek = date.getDay()
                      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                      
                      const cells = []
                      if (isFirst) {
                          for (let j = 0; j < adjustedDayOfWeek; j++) {
                              cells.push(<div key={`empty-${j}`} className="border-r border-b border-border bg-secondary/5 h-20 md:h-24" />)
                          }
                      }

                      cells.push(
                          <div 
                            key={i} 
                            onClick={() => {
                              setSelectedDate(date)
                              setModalOpen(true)
                            }}
                            className={cn(
                              "border-r border-b border-border h-20 md:h-24 p-2 relative group hover:bg-secondary/30 transition-all duration-500 cursor-pointer select-none", 
                              date.toDateString() === today.toDateString() ? "bg-foreground/5 shadow-inner" : "bg-card/40",
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
                                          <div className="text-[8px] font-mono text-emerald-500 truncate font-semibold">+{currencySymbol}{dayIn.toFixed(0)}</div>
                                      )}
                                      {dayOut > 0 && (
                                          <div className="text-[8px] font-mono text-muted-foreground truncate">-{currencySymbol}{dayOut.toFixed(0)}</div>
                                      )}
                                  </div>
                              )}
                          </div>
                      )
                      return cells
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3. Metric cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { 
                label: "Liquidity Position", 
                value: cycleEndBalance, 
                sub: "EST. CYCLE END",
                tooltip: "Est. End Balance",
                tooltipDesc: "Aggregated balance of all active accounts sync'ed up to the end of the current cycle, reflecting all inputs.",
                footerLeft: `vs PREV CYCLE: ${delta >= 0 ? '+' : ''}${currencySymbol}${Math.abs(delta).toFixed(2)}`,
                footerRight: `BURN: ${currencySymbol}${(cleanTotalOut / Math.max(1, daysElapsed)).toFixed(2)}/d`,
                progressWidth: Math.min(100, Math.max(0, (cycleEndBalance / Math.max(1, previousCycleEndBalance)) * 100)),
                progressColor: delta >= 0 ? "bg-emerald-500" : "bg-destructive",
                isDelta: true,
                deltaSign: delta >= 0
              },
              { 
                label: "Total Inflow", 
                value: totalIn, 
                sub: "REVENUE TARGET", 
                tooltip: "Total Inflow Volume",
                tooltipDesc: "All positive transactions parsed in the current paycheck cycle, including payroll and incoming transfers.",
                footerLeft: `TARGET: ${currencySymbol}${targetMonthlyIncome.toFixed(0)}`,
                footerRight: `ACHIEVED: ${inflowPercent.toFixed(1)}%`,
                progressWidth: Math.min(100, inflowPercent),
                progressColor: "bg-foreground",
                isDelta: false
              },
              { 
                label: "Total Outflow", 
                value: totalOut, 
                sub: "SPENDING LIMIT",
                tooltip: "Total Burn Amount",
                tooltipDesc: "Total value of all parsed debit transactions, expenses, and system cash outflows in this cycle.",
                footerLeft: `LIMIT: ${currencySymbol}${targetMonthlySpend.toFixed(0)}`,
                footerRight: `CONSUMED: ${outflowPercent.toFixed(1)}%`,
                progressWidth: Math.min(100, outflowPercent),
                progressColor: outflowPercent > 100 ? "bg-destructive" : "bg-foreground",
                isDelta: false
              }
            ].map((metric, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative h-full flex flex-col justify-stretch min-w-0 w-full",
                  idx === 0 ? "col-span-2 md:col-span-1" : "col-span-1"
                )}
              >
                <Tilt 
                  rotationFactor={8}
                  className={cn(
                    "p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between grow w-full h-full min-w-0 glow-card"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 z-10 w-full min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">{metric.label}</span>
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter shrink-0 hidden sm:inline-block">
                      {metric.sub}
                    </span>
                  </div>

                  <div className={cn("text-2xl lg:text-3xl font-sans font-bold tracking-tight z-10 w-full flex items-baseline gap-1 py-1 whitespace-nowrap", idx === 1 ? "text-emerald-500" : "")}>
                    <PrivacyValue>
                      <NumberTicker value={metric.value} prefix={currencySymbol} />
                    </PrivacyValue>
                  </div>

                  <div className="z-10 w-full min-w-0 space-y-2 mt-auto">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-[9px] font-mono w-full min-w-0">
                      <span className={cn(
                        metric.isDelta ? (metric.deltaSign ? "text-emerald-500 font-medium" : "text-destructive font-medium") : "text-muted-foreground",
                        "whitespace-nowrap"
                      )}>
                        {metric.footerLeft}
                      </span>
                      <span className="text-foreground font-bold shrink-0">{metric.footerRight}</span>
                    </div>
                    <div className="w-full h-1 bg-secondary/30 rounded-none border border-border/40 overflow-hidden">
                      <div className={cn("h-full transition-all duration-500", metric.progressColor)} style={{ width: `${metric.progressWidth}%` }} />
                    </div>
                  </div>
                </Tilt>
              </div>
            ))}
          </div>

          {/* Active Paycheck Cycle HUD & Smart Forecasts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paycheck Cycle Card */}
            <Tilt rotationFactor={4} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between w-full glow-card">
              <div className="flex justify-between items-center text-xs font-mono z-10">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active Cycle
                </span>
                <span className={cn("font-bold px-2.5 py-0.5 text-[10px] uppercase font-mono border", (totalIn - totalOut) >= 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-destructive bg-destructive/10 border-destructive/20")}>
                  <PrivacyValue>
                    {(totalIn - totalOut) >= 0 ? "+" : ""}{currencySymbol}{(totalIn - totalOut).toFixed(2)} Surplus
                  </PrivacyValue>
                </span>
              </div>

              <div className="space-y-2 z-10">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground"><PrivacyValue>Inflow: {currencySymbol}{totalIn.toFixed(0)}</PrivacyValue></span>
                  <span className="text-foreground font-semibold">Available Budget: {Math.max(0, 100 - Math.round((totalOut / (totalIn || 1)) * 100))}%</span>
                  <span className="text-muted-foreground"><PrivacyValue>Outflow: {currencySymbol}{totalOut.toFixed(0)}</PrivacyValue></span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-none overflow-hidden border border-border/80 relative">
                  <div
                    className={cn("h-full transition-all duration-500", (totalOut / (totalIn || 1)) > 0.9 ? "bg-destructive" : "bg-emerald-500")}
                    style={{ width: `${Math.min(100, (totalOut / (totalIn || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans z-10 leading-relaxed">
                Tracks spending capacity from payday to payday, eliminating calendar-reset distortion.
              </p>
            </Tilt>

            {/* Smart Forecasts Card */}
            {!isPro ? (
              <ProLockOverlay 
                title="CYCLE FORECASTING (PRO)"
                description="Unlock advanced end-of-cycle cash flow forecasting models and daily recency-decay velocity projections."
                className="h-full min-h-[180px] flex flex-col justify-center rounded-none border border-border bg-card/20"
              />
            ) : (
              <div className="relative flex flex-col justify-stretch w-full">
                <Tilt 
                  rotationFactor={4} 
                  className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between grow w-full glow-card"
                >
                  <div className="flex justify-between items-center text-xs font-mono z-10">
                    <span className="text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-semibold text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cycle Forecast
                    </span>
                    <span className="font-bold text-foreground bg-secondary px-2.5 py-0.5 text-[10px] uppercase font-mono border border-border">
                      <PrivacyValue>{currencySymbol}{estimatedFinalBalance.toFixed(2)} Est.</PrivacyValue>
                    </span>
                  </div>

                  <div className="space-y-2 z-10">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground font-mono">Projected Surplus</span>
                      <span className={cn(
                        "text-xl md:text-2xl font-mono font-bold tracking-tight",
                        estimatedFinalBalance >= 0 ? "text-emerald-500" : "text-destructive"
                      )}>
                        <PrivacyValue>{currencySymbol}{estimatedFinalBalance.toFixed(2)}</PrivacyValue>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
                      <span>Based on 7-day velocity decay</span>
                      <span className={cn("font-semibold flex items-center gap-1", onTrack ? "text-emerald-500" : "text-amber-500")}>
                        {onTrack ? "Optimal" : "High Burn"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans z-10 leading-relaxed">
                    Forecasts your exact cash position before cycle close based on spending pattern decay.
                  </p>
                </Tilt>
              </div>
            )}
          </div>

          {/* 4. Budgets Performance */}
          <section className="space-y-8 [content-visibility:auto] [contain-intrinsic-size:1px_300px]">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold">Budget Limits</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{activeBudgets.length} ACTIVE LIMITS</span>
            </div>
            
            {activeBudgets.length === 0 ? (
              <div className="p-6 border border-border ledger-border bg-card/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-bold uppercase text-foreground">
                    No Budget Limits Configured
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans max-w-xl">
                    Establish category spending caps for dining, transport, subscriptions, or leisure to track real-time capacity and surplus.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/budgets')}
                  className="h-9 rounded-none border-border bg-secondary/30 hover:bg-secondary text-foreground font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Target className="h-3.5 w-3.5" /> Configure Budgets
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {activeBudgets.map((cat) => {
                  const netBalance = cat.netBalance !== undefined ? cat.netBalance : -cat.value
                  const isProfitable = netBalance > 0
                  const netSpent = netBalance < 0 ? Math.abs(netBalance) : 0

                  const percentage = cat.limit > 0 ? (Math.abs(netBalance) / cat.limit) * 100 : 0
                  const isOver = !isProfitable && netSpent > cat.limit && cat.limit > 0

                  return (
                    <div 
                      key={cat.name} 
                      className="space-y-3 group cursor-pointer hover:bg-secondary/20 p-2.5 -mx-2.5 rounded-none transition-colors border border-transparent hover:border-border/40" 
                      onClick={() => {
                        setSelectedCategoryForGraph(cat)
                        setBudgetGraphOpen(true)
                      }}
                    >
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold uppercase tracking-tight block">{cat.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">
                            {isProfitable 
                              ? `+${currencySymbol}${netBalance.toFixed(0)} surplus` 
                              : isOver 
                                ? "limit exceeded" 
                                : `${currencySymbol}${(cat.limit - netSpent).toFixed(0)} remaining`
                            }
                          </span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className={cn("text-xs font-mono font-bold", isProfitable ? "text-emerald-500" : "")}>
                            <PrivacyValue>
                              {isProfitable ? "+" : ""}{currencySymbol}{isProfitable ? Math.round(netBalance) : Math.round(netSpent)}
                            </PrivacyValue>
                            <span className="text-muted-foreground/60 font-normal"> / {currencySymbol}{cat.limit.toFixed(0)}</span>
                          </div>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase">
                            {isProfitable 
                              ? `+${percentage.toFixed(0)}% surplus` 
                              : `${percentage.toFixed(0)}% used`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative w-full h-2 bg-secondary/30 rounded-none border border-border/40 flex items-center">
                        {/* Zero center-line indicator */}
                        <div className="absolute left-1/2 -top-0.5 -bottom-0.5 -translate-x-1/2 w-[1px] bg-foreground/50 z-20" />

                        <div className="absolute inset-0 overflow-hidden">
                          {isProfitable && (
                            <div 
                              className="absolute left-1/2 top-0 bottom-0 bg-emerald-500 transition-all duration-1000"
                              style={{ width: `${Math.min(50, (netBalance / (cat.limit || 100)) * 50)}%` }}
                            />
                          )}

                          {!isProfitable && netSpent > 0 && (
                            <div 
                              className={cn("absolute right-1/2 top-0 bottom-0 transition-all duration-1000", isOver ? "bg-destructive" : "bg-foreground")}
                              style={{ width: `${Math.min(50, (netSpent / (cat.limit || 100)) * 50)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 5. Logs & Archive Grid / First-Time Empty State */}
          {expenses.length === 0 ? (
            <div className="p-6 sm:p-8 bg-card/25 border border-border ledger-border space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      Workspace Ready · Awaiting First Data Stream
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Your paycheck cycle, habit categories, and projection engine are primed. Ingest your first statement or record a transaction to begin real-time forecasting:
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase bg-secondary px-2.5 py-1 border border-border text-foreground font-bold shrink-0 self-start sm:self-auto">
                  0 Recorded Entries
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div 
                  onClick={() => router.push('/expenses')} 
                  className="p-4 bg-secondary/15 border border-border hover:border-foreground/50 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="p-2 bg-secondary/30 border border-border w-fit group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-mono uppercase text-foreground">Upload Bank Statement</h4>
                    <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                      Drop your Santander, Revolut, or universal bank PDF/TXT statement for instant parsing.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-foreground font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Ingest File →
                  </span>
                </div>

                <div 
                  onClick={() => router.push('/system')} 
                  className="p-4 bg-secondary/15 border border-border hover:border-foreground/50 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="p-2 bg-secondary/30 border border-border w-fit group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-mono uppercase text-foreground">Connect Mobile Device</h4>
                    <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                      Configure Apple Pay Shortcuts or the Android background listener for automated ingestion.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-foreground font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Sync Device →
                  </span>
                </div>

                <div 
                  onClick={() => router.push('/expenses')} 
                  className="p-4 bg-secondary/15 border border-border hover:border-foreground/50 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="p-2 bg-secondary/30 border border-border w-fit group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-mono uppercase text-foreground">Add Manual Entry</h4>
                    <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                      Record a one-off expense or income deposit manually to calibrate your daily burn rate.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-foreground font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Record Entry →
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-10 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
              <div className="space-y-6">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold border-b border-border pb-4">Category Breakdown</h3>
                <div className="space-y-6">
                  {spendingByCategory.map((cat) => (
                    <div key={cat.name} className="group cursor-default">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold uppercase tracking-tight group-hover:pl-2 transition-all duration-300 block">{cat.name}</span>
                        <span className="text-xs font-mono font-bold uppercase">{currencySymbol}{cat.value.toFixed(2)}</span>
                      </div>
                      <div className="h-px w-full bg-border relative">
                        <div className="absolute top-0 left-0 h-px bg-foreground transition-all duration-700" style={{ width: `${(cat.value / totalOut) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold">Recent Transactions</h3>
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
                          <p className="text-xs font-bold uppercase truncate max-w-[180px] sm:max-w-xs tracking-tight group-hover:pl-1 transition-all">{exp.merchant || "UNSPECIFIED"}</p>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase">{new Date(exp.date).toLocaleDateString(language, { day: '2-digit', month: 'short' })}</p>
                        </div>
                        <div className={cn("text-xs font-mono font-bold", parseFloat(exp.amount) > 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                          <PrivacyValue><NumberTicker value={Math.abs(parseFloat(exp.amount))} prefix={parseFloat(exp.amount) > 0 ? "+" : currencySymbol} /></PrivacyValue>
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
          )}

      {/* Clean Minimal App Footer */}
      <footer className="w-full border-t border-border/40 py-6 mt-16 relative z-10 font-mono text-[10px] text-muted-foreground">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="font-bold uppercase tracking-wider text-foreground">LEGER_OS</span>
            <span className="opacity-40">•</span>
            <span className="uppercase tracking-widest text-[9px]">Personal Finance Mainframe</span>
          </div>

          <div className="flex items-center gap-4 uppercase tracking-wider text-[9px]">
            <a href="/terms.txt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <span className="opacity-40">•</span>
            <a href="/privacy.txt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs w-[95vw] md:max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-xs uppercase tracking-widest font-mono text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>Transactions: {selectedDate?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground">
              Temporal Audit Trace for Selected Day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDate && (expensesByDate[selectedDate.toDateString()] || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground opacity-60">
                NO TRANSACTIONS RECORDED FOR THIS DAY
              </div>
            ) : (
              <div className="border border-border ledger-border overflow-hidden">
                <table className="w-full text-[10px] md:text-xs">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr className="text-left font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-2 md:p-3">Merchant</th>
                      <th className="p-2 md:p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedDate && (expensesByDate[selectedDate.toDateString()] || []).map((tx: any, idx: number) => {
                      const amountVal = parseFloat(tx.amount)
                      const isInc = amountVal > 0
                      return (
                        <tr 
                          key={tx.id || idx} 
                          onClick={() => {
                            setModalOpen(false)
                            openAudit(tx.id)
                          }}
                          className="hover:bg-secondary/10 transition-colors cursor-pointer"
                        >
                          <td className="p-2 md:p-3 font-medium text-foreground max-w-[180px] sm:max-w-xs truncate" title={tx.merchant}>
                            {tx.merchant}
                          </td>
                          <td className={cn(
                            "p-2 md:p-3 text-right font-bold font-mono",
                            isInc ? "text-emerald-500" : "text-foreground"
                          )}>
                            <PrivacyValue>
                              {isInc ? "+" : "-"}{currencySymbol}{Math.abs(amountVal).toFixed(2)}
                            </PrivacyValue>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={budgetGraphOpen} onOpenChange={setBudgetGraphOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs w-[95vw] md:max-w-5xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-xs uppercase tracking-widest font-mono text-foreground flex items-center gap-2">
              <span>Category Audit: {selectedCategoryForGraph?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground">
              Cumulative Cycle Spend Curve Analysis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-border ledger-border p-4 bg-card/25">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-muted-foreground uppercase">Budget Limit</span>
                <p className="text-xs font-bold font-mono text-foreground">
                  {currencySymbol}{selectedCategoryForGraph?.limit?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-muted-foreground uppercase">Current Spend</span>
                <p className="text-xs font-bold font-mono text-foreground">
                  {currencySymbol}{categoryGraphData[categoryGraphData.length - 1]?.spend?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[8px] font-mono text-muted-foreground uppercase">Status</span>
                <p className={cn(
                  "text-xs font-bold font-mono uppercase",
                  (categoryGraphData[categoryGraphData.length - 1]?.spend || 0) > (selectedCategoryForGraph?.limit || 0)
                    ? "text-destructive"
                    : "text-emerald-500"
                )}>
                  {(categoryGraphData[categoryGraphData.length - 1]?.spend || 0) > (selectedCategoryForGraph?.limit || 0)
                    ? "LIMIT EXCEEDED"
                    : "UNDER LIMIT"}
                </p>
              </div>
            </div>

            <div className="h-[220px] md:h-[380px] w-full border border-border ledger-border p-2 bg-card/10">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart data={categoryGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="categoryActiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="categoryProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={0.15}/>
                    </linearGradient>
                    <linearGradient id="categoryStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={1}/>
                      <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                    dy={5} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                    tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`} 
                  />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-card border border-border p-2 font-mono text-[9px] space-y-1.5 shadow-sm z-50">
                            <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
                            <p className="flex justify-between gap-6 uppercase">
                              <span>Cumulative Spent:</span> 
                              <span>{currencySymbol}{data.spend.toFixed(2)}</span>
                            </p>
                            <p className="flex justify-between gap-6 uppercase text-emerald-500 font-semibold">
                              <span>Net Profit/Loss:</span> 
                              <span className={data.netProfitLoss >= 0 ? "text-emerald-500" : "text-destructive"}>
                                {data.netProfitLoss >= 0 ? "+" : ""}{currencySymbol}{data.netProfitLoss.toFixed(2)}
                              </span>
                            </p>
                            <p className="flex justify-between gap-6 opacity-60 uppercase text-[8px] pt-1 border-t border-border/40">
                              <span>Budget Limit:</span> 
                              <span>{currencySymbol}{data.limit.toFixed(2)}</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
                  <RechartsArea 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="var(--foreground)" 
                    strokeWidth={2} 
                    fill="url(#categoryActiveGradient)" 
                    fillOpacity={1} 
                    connectNulls={true}
                    name="Cumulative Spent"
                  />
                  <RechartsArea 
                    type="monotone" 
                    dataKey="netProfitLoss" 
                    stroke="url(#categoryStrokeGradient)" 
                    strokeWidth={2} 
                    fill="url(#categoryProfitGradient)" 
                    fillOpacity={1} 
                    connectNulls={true}
                    name="Net Position"
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        </motion.div>
      )}

      {/* Mobile sticky cycle nav bar (above bottom nav) */}
      <CycleMobileBar
        cycles={cycles}
        currentCycleId={currentCycleId}
        route="/"
        onCycleChange={handleCycleSelect}
      />
    </SwipeCycleWrapper>
  )
}
