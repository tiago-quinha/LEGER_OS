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
import { Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight, Banknote, ChevronLeft, CalendarDays, ChevronRight, Landmark, Target, AlertTriangle, CheckCircle2, Zap, Brain, Sparkles, ChevronDown, Loader2 } from "lucide-react"
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
const LegerAIIntelligence = dynamic(() => import("@/components/LegerAIIntelligence").then(mod => mod.LegerAIIntelligence), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full border border-border ledger-border bg-card/20 rounded-lg p-6 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[78%]" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
})

interface CurvePoint {
  inflow: number
  outflow: number
}

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
  const merchantMap = new Map<string, { amounts: number[], days: number[] }>()
  pastExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && e.date) {
      const m = (e.merchant || "").trim().toUpperCase()
      if (!merchantMap.has(m)) merchantMap.set(m, { amounts: [], days: [] })
      const entry = merchantMap.get(m)!
      entry.amounts.push(Math.abs(amt))
      const day = new Date(e.date).getDate() - 1
      if (day >= 0 && day <= 31) entry.days.push(day)
    }
  })

  const recurringMerchants: { merchant: string, amount: number, expectedDay: number }[] = []
  merchantMap.forEach((val, key) => {
    if (val.amounts.length >= 2) {
      val.amounts.sort((a, b) => a - b)
      val.days.sort((a, b) => a - b)
      const medianAmt = val.amounts[Math.floor(val.amounts.length / 2)]
      const medianDay = val.days[Math.floor(val.days.length / 2)]
      if (val.amounts[0] >= medianAmt * 0.65 && val.amounts[val.amounts.length - 1] <= medianAmt * 1.35) {
        recurringMerchants.push({ merchant: key, amount: medianAmt, expectedDay: medianDay })
      }
    }
  })

  const recurringNames = new Set(recurringMerchants.map(r => r.merchant))

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
    
  const effectiveElapsed = Math.max(1, Math.min(daysElapsed, totalDaysInCycle))
  const todayTime = today.getTime()

  // Recency-weighted daily variable burn rate (adapts daily and expense-by-expense with half-life decay)
  let weightedSpend = 0
  let totalWeight = 0
  currentExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && new Date(e.date) <= today && !recurringNames.has((e.merchant || "").trim().toUpperCase())) {
      const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
      if (daysAgo <= effectiveElapsed) {
        const w = Math.exp(-decayRate * daysAgo) // Lambda decayRate = user configured decay weighting
        weightedSpend += Math.abs(amt) * w
        totalWeight += w
      }
    }
  })
  const unweightedVariableSpend = Math.max(0, currentActualOut - currentRecurringSpent)
  const standardDailyBurn = unweightedVariableSpend / effectiveElapsed
  const currentDailyVariableBurn = totalWeight > 0 ? (weightedSpend / totalWeight) : standardDailyBurn

  const pastVariableTotal = pastExpenses
    .filter((e: any) => parseFloat(e.amount) < 0 && !recurringNames.has((e.merchant || "").trim().toUpperCase()))
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
          if (amt < 0 && new Date(e.date) <= today && (ov.categoryId ? e.category_id === ov.categoryId : true)) {
            const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
            if (daysAgo <= effectiveElapsed) {
              const w = Math.exp(-decayRate * daysAgo)
              catWeightedSpend += Math.abs(amt) * w
              catTotalWeight += w
            }
          }
        })
        const catSpentCurrent = currentExpenses
          .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0 && (ov.categoryId ? e.category_id === ov.categoryId : true))
          .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
        const catDailyCurrent = catTotalWeight > 0 ? (catWeightedSpend / catTotalWeight) : (catSpentCurrent / effectiveElapsed)

        const catSpentPast = pastExpenses
          .filter((e: any) => parseFloat(e.amount) < 0 && (ov.categoryId ? e.category_id === ov.categoryId : true))
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
  expenses, 
  categories, 
  budgets, 
  balances, 
  cycles, 
  currentCycleId, 
  injectedStartBalance, 
  previousExpenses, 
  previousStartBalance,
  allPastExpenses,
  paycheckKeyword,
  targetMonthlyIncome = 2500,
  targetMonthlySpend = 1500
}: DashboardViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [navigationDirection, setNavigationDirection] = useState<'prev' | 'next' | null>(null)
  const { setAuditPanelOpen, setActiveTransactionId, currencySymbol, language, decayWeight, isPro, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly, profile, user, refreshProfile } = useSystem()
  
  const currentCycle = cycles.find(c => c.id === currentCycleId) || cycles[0]

  // DATA CALCULATIONS
  const totalOut = expenses
    .filter(exp => parseFloat(exp.amount) < 0)
    .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)

  const totalIn = expenses
    .filter(exp => parseFloat(exp.amount) > 0)
    .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)

  const netChange = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
  const cycleEndBalance = injectedStartBalance + netChange
  const netFlow = totalIn - totalOut

  const calculateDaysElapsed = () => {
    if (!currentCycle) return 30
    const start = new Date(currentCycle.startDate)
    const end = currentCycle.endDate ? new Date(currentCycle.endDate) : new Date()
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays)
  }

  const daysElapsed = calculateDaysElapsed()

  const calculateTotalDays = () => {
    if (!currentCycle || !currentCycle.endDate) return 30
    const start = new Date(currentCycle.startDate)
    const end = new Date(currentCycle.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  const totalDaysInCycle = calculateTotalDays()
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

  const navigateCycle = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (cycles[nextIndex]) {
      setNavigationDirection(direction)
      startTransition(() => {
        router.push(`/?cycleId=${cycles[nextIndex].id}`)
      })
    }
  }

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

  const deleteOverride = (categoryId: string | number) => {
    const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
    const updated = existing.filter((o: any) => o.categoryId !== categoryId)
    saveOverrides(updated)
  }

  const handleAddManualOverride = (e: React.FormEvent) => {
    e.preventDefault()
    const pct = parseFloat(manualPercent)
    if (isNaN(pct) || pct <= 0) return

    const multiplier = manualDirection === "increase" ? (1 + pct / 100) : Math.max(0, 1 - pct / 100)
    
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
      categoryId,
      categoryName,
      multiplier,
      reason: manualReason.trim() || "Manual adjustment",
      fixedDelta: null
    }

    const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
    const updated = existing.filter((o: any) => o.categoryId !== categoryId)
    updated.push(newOverride)

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
      
      const dayTx = expenses.filter(e => 
        e.category_id?.toString() === selectedCategoryForGraph.id?.toString() &&
        new Date(e.date) <= dateEnd && 
        new Date(e.date) > (i > 0 ? new Date(new Date(cycleStart).setDate(new Date(cycleStart).getDate() + i - 1)) : new Date(0))
      )
      
      const dayOut = dayTx.filter(e => parseFloat(e.amount) < 0).reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0)
      const dayIn = dayTx.filter(e => parseFloat(e.amount) > 0).reduce((sum, e) => sum + parseFloat(e.amount), 0)
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
    // Generate a stable decision once per user session
    const sessionKey = "leger_session_graph_lock"
    let stored = sessionStorage.getItem(sessionKey)
    if (!stored) {
      // 40% chance of locking the graph to remind them of the PRO features
      const decideLock = Math.random() < 0.4 ? "true" : "false"
      sessionStorage.setItem(sessionKey, decideLock)
      stored = decideLock
    }
    setShowGraphLock(stored === "true")

    // Check if graph lock is currently dismissed (3-hour window)
    if (!isPro) {
      const dismissedUntil = localStorage.getItem('leger_pro_graph_dismissed_until')
      if (dismissedUntil) {
        const time = parseInt(dismissedUntil, 10)
        if (!isNaN(time) && Date.now() < time) {
          setViewMode('calendar')
        }
      }
    }
  }, [isPro])

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
  })

  const spendingByCategory = categories.map(cat => {
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
  }).filter(c => c.value > 0 || c.limit > 0 || c.netBalance !== 0).sort((a, b) => b.value - a.value)

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 w-full"
    >
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <Landmark className="h-3 w-3" />
            <span>Financial Statement</span>
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

          <div className="flex border border-border ledger-border bg-card overflow-hidden">
            <MagneticButton 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateCycle('prev')} 
              disabled={isPending || currentIndex >= cycles.length - 1} 
              className="h-10 w-10 md:h-12 md:w-12 border-r border-border rounded-none hover:bg-secondary flex items-center justify-center" 
              strength={0.35} 
              aria-label="Previous paycheck cycle"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </MagneticButton>
            <MagneticButton 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateCycle('next')} 
              disabled={isPending || currentIndex <= 0} 
              className="h-10 w-10 md:h-12 md:w-12 rounded-none hover:bg-secondary flex items-center justify-center" 
              strength={0.35} 
              aria-label="Next paycheck cycle"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </MagneticButton>
          </div>
        </div>
      </header>

      {/* Dual Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Core Financial Path (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">
          
          {/* 2. Trajectories */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <button 
                    onClick={() => setActiveTab('liquidity')}
                    className={cn(
                      "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest transition-all",
                      activeTab === 'liquidity' ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                  >
                    Liquidity
                  </button>
                  <button 
                    onClick={() => setActiveTab('burn')}
                    className={cn(
                      "px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest transition-all border-l border-border",
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
                 <div className="flex items-center justify-center grow sm:grow-0">
                    {activeTab === 'burn' ? (
                      <GlowingBadge variant={onTrack ? "success" : "error"} pulse dot className="px-4 py-2 border-border/40 flex items-center gap-2 font-mono">
                        <span>{onTrack ? "STATUS: OPTIMAL" : "STATUS: CRITICAL"}</span>
                        <span className="opacity-40">•</span>
                        <span>BURN: <PrivacyValue>{currencySymbol}{(totalOut / Math.max(1, daysElapsed)).toFixed(2)}/d</PrivacyValue></span>
                      </GlowingBadge>
                    ) : (
                      <GlowingBadge variant={delta >= 0 ? "success" : "error"} pulse dot className="px-4 py-2 border-border/40 flex items-center gap-2 font-mono">
                        <span>DELTA: <PrivacyValue><NumberTicker value={Math.abs(delta)} prefix={delta >= 0 ? "+" : `-${currencySymbol}`} /></PrivacyValue></span>
                        <span className="opacity-40">•</span>
                        <span>BURN: <PrivacyValue>{currencySymbol}{(totalOut / Math.max(1, daysElapsed)).toFixed(2)}/d</PrivacyValue></span>
                      </GlowingBadge>
                    )}
                 </div>
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
                  {!isPro && showGraphLock && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-[12px] flex flex-col items-center justify-center p-6 text-center select-none z-10 transition-all duration-300">
                      <div className="max-w-md space-y-4 p-6 border border-emerald-500/30 bg-background/90 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                          <Sparkles className="h-3 w-3 animate-pulse" /> PRO FEATURE GATED
                        </div>
                        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Advanced Projection Engine Locked</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                          Upgrade to LEGER_OS PRO to unlock daily recency-decay cash flow forecasting, Monte Carlo simulation paths, and custom AI overrides.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <Button 
                            onClick={() => {
                              setSettingsActiveTab("pro");
                              setSubscriptionOnly(true);
                              setSettingsOpen(true);
                            }}
                            className="flex-1 h-9 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider"
                          >
                            Upgrade to PRO (€4.99/mo)
                          </Button>
                          <Button 
                            onClick={() => {
                              setViewMode('calendar')
                              localStorage.setItem('leger_pro_graph_dismissed_until', (Date.now() + 3 * 60 * 60 * 1000).toString())
                            }}
                            variant="outline"
                            className="flex-1 h-9 rounded-none border-border hover:bg-secondary/40 text-muted-foreground font-mono text-[10px] uppercase font-bold tracking-wider"
                          >
                            Dismiss (Calendar View)
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full mt-6">
                  <div className="w-full grid grid-cols-7 border-t border-l border-border ledger-border bg-card/20">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                label: "Liquidity Position", 
                value: cycleEndBalance, 
                sub: "EST. CYCLE END",
                tooltip: "Est. End Balance",
                tooltipDesc: "Aggregated balance of all active accounts sync'ed up to the end of the current cycle, reflecting all inputs.",
                footerLeft: `vs PREV CYCLE: ${delta >= 0 ? '+' : ''}${currencySymbol}${Math.abs(delta).toFixed(2)}`,
                footerRight: `BURN: ${currencySymbol}${(totalOut / Math.max(1, daysElapsed)).toFixed(2)}/d`,
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
                onClick={() => {
                  if (idx === 0 && !isPro) {
                    setSettingsActiveTab("pro");
                    setSubscriptionOnly(true);
                    setSettingsOpen(true);
                  }
                }}
                className={cn(
                  "relative h-full flex flex-col justify-stretch min-w-0 w-full md:col-span-1",
                  (!isPro && idx === 0) ? "cursor-pointer" : ""
                )}
              >
                <Tilt 
                  rotationFactor={8}
                  className={cn(
                    "p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between grow w-full h-full min-w-0 glow-card"
                  )}
                >
                  <div className="flex items-center justify-between z-10 w-full min-w-0">
                    <FloatingTooltipTrigger content={metric.tooltip} description={metric.tooltipDesc}>
                      <span className="technical-label text-[9px] uppercase tracking-wider cursor-help border-b border-dotted border-muted-foreground/30 whitespace-nowrap">{metric.label}</span>
                    </FloatingTooltipTrigger>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter shrink-0">
                      {metric.sub}
                    </span>
                  </div>

                  <div className={cn("text-2xl lg:text-3xl font-mono font-bold tracking-tighter z-10 w-full flex items-baseline gap-1 py-1 whitespace-nowrap", idx === 1 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                    <PrivacyValue>
                      <NumberTicker value={metric.value} prefix={currencySymbol} />
                    </PrivacyValue>
                  </div>

                  <div className="z-10 w-full min-w-0 space-y-2 mt-auto">
                    <div className="flex items-center justify-between text-[9px] font-mono w-full min-w-0">
                      <span className={cn(
                        metric.isDelta ? (metric.deltaSign ? "text-emerald-500 font-medium" : "text-destructive font-medium") : "text-muted-foreground",
                        "whitespace-nowrap"
                      )}>
                        {metric.footerLeft}
                      </span>
                      <span className="text-foreground font-semibold shrink-0">{metric.footerRight}</span>
                    </div>
                    <div className="w-full h-1 bg-secondary/30 rounded-none border border-border/40 overflow-hidden">
                      <div className={cn("h-full transition-all duration-500", metric.progressColor)} style={{ width: `${metric.progressWidth}%` }} />
                    </div>
                  </div>
                </Tilt>
              </div>
            ))}
          </div>

          {/* 4. Budgets Performance */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <h2 className="technical-label">Budget Performance</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{activeBudgets.length} ACTIVE LIMITS</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {activeBudgets.map((cat) => {
                const netBalance = cat.netBalance !== undefined ? cat.netBalance : -cat.value
                const isProfitable = netBalance > 0
                const netSpent = netBalance < 0 ? Math.abs(netBalance) : 0
                const netProfit = isProfitable ? netBalance : 0

                const percentage = cat.limit > 0 ? (Math.abs(netBalance) / cat.limit) * 100 : 0
                const isOver = !isProfitable && netSpent > cat.limit && cat.limit > 0

                return (
                  <div 
                    key={cat.name} 
                    className="space-y-3 group cursor-pointer" 
                    onClick={() => {
                      setSelectedCategoryForGraph(cat)
                      setBudgetGraphOpen(true)
                    }}
                  >
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-tight group-hover:text-foreground transition-colors">{cat.name}</p>
                        <p className="text-[9px] font-mono text-muted-foreground uppercase">
                          {isProfitable ? `+${currencySymbol}${netProfit.toFixed(2)} NET SURPLUS` : isOver ? "THRESHOLD EXCEEDED" : `${currencySymbol}${(cat.limit - netSpent).toFixed(2)} REMAINING`}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={cn("text-xs font-mono font-bold", isProfitable ? "text-emerald-600 dark:text-emerald-400" : "")}>
                          <PrivacyValue><NumberTicker value={isProfitable ? netProfit : netSpent} prefix={isProfitable ? `+${currencySymbol}` : currencySymbol} /></PrivacyValue> 
                          <span className="text-muted-foreground font-normal opacity-40"> / {currencySymbol}{cat.limit.toFixed(2)}</span>
                        </div>
                        <p className={cn("text-[9px] font-mono font-bold uppercase tracking-tighter", isProfitable ? "text-emerald-600 dark:text-emerald-400" : isOver ? "text-destructive" : "text-muted-foreground")}>
                          {isProfitable ? `+${percentage.toFixed(1)}% (+${currencySymbol}${netProfit.toFixed(2)}) SURPLUS →` : `← ${percentage.toFixed(1)}% (${currencySymbol}${netSpent.toFixed(2)}) USED`}
                        </p>
                      </div>
                    </div>
                    <div className="relative w-full h-2.5 bg-secondary/60 rounded-none border border-border/40 flex items-center">
                      <div className="absolute left-1/2 -top-1 -bottom-1 -translate-x-1/2 w-0.5 bg-foreground dark:bg-white z-20 shadow-[0_0_6px_rgba(0,0,0,0.3)] dark:shadow-[0_0_6px_rgba(255,255,255,0.4)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-white" />
                      </div>

                      <div className="absolute inset-0 overflow-hidden">
                        {isProfitable && (
                          <div 
                            className="absolute left-1/2 top-0 bottom-0 bg-emerald-600 dark:bg-emerald-400 transition-all duration-1000"
                            style={{ width: `${Math.min(50, (netProfit / (cat.limit || 100)) * 50)}%` }}
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
          </section>

          {/* 5. Logs & Archive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-10">
            <div className="space-y-6">
              <h3 className="technical-label border-b border-border pb-4 uppercase">Classification Log</h3>
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

        </div>

        {/* RIGHT COLUMN: Control Center / Telemetry (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-10 md:space-y-14 border-t lg:border-t-0 lg:border-l border-border/50 pt-10 lg:pt-0 lg:pl-6">
          
          {/* Active Paycheck Cycle HUD & Smart Forecasts */}
          <div className="space-y-6">
            {/* Paycheck Cycle Card */}
            <Tilt rotationFactor={4} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border hover:bg-secondary/35 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between w-full">
              <div className="flex justify-between items-center text-xs font-mono z-10">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Paycheck Cycle
                </span>
                <span className={cn("font-bold px-2.5 py-0.5 text-[10px] uppercase font-mono border", (totalIn - totalOut) >= 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-destructive bg-destructive/10 border-destructive/20")}>
                  <PrivacyValue>
                    {(totalIn - totalOut) >= 0 ? "+" : ""}{currencySymbol}{(totalIn - totalOut).toFixed(2)} Net Surplus
                  </PrivacyValue>
                </span>
              </div>

              <div className="space-y-2 z-10">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground"><PrivacyValue>Inflow: {currencySymbol}{totalIn.toFixed(0)}</PrivacyValue></span>
                  <span className="text-foreground font-semibold">Remaining Power: {Math.max(0, 100 - Math.round((totalOut / (totalIn || 1)) * 100))}%</span>
                  <span className="text-muted-foreground"><PrivacyValue>Outflow: {currencySymbol}{totalOut.toFixed(0)}</PrivacyValue></span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-none overflow-hidden border border-border/80 relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/40 z-10 -translate-x-1/2" />
                  <div
                    className={cn("absolute top-0 bottom-0 left-1/2 transition-all duration-500", (totalIn - totalOut) >= 0 ? "bg-emerald-500/85" : "bg-destructive/85")}
                    style={{
                      width: `${Math.min(50, (Math.abs(totalIn - totalOut) / (totalIn || 1)) * 50)}%`,
                      transform: (totalIn - totalOut) >= 0 ? 'translateX(0)' : 'translateX(-100%)'
                    }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono z-10">
                Tracks real spending power from payday to payday, eliminating calendar reset friction.
              </p>
            </Tilt>

            {/* Smart Forecasts Card */}
            <div
              onClick={() => {
                if (!isPro) {
                  setSettingsActiveTab("pro");
                  setSubscriptionOnly(true);
                  setSettingsOpen(true);
                }
              }}
              className={cn(
                "relative flex flex-col justify-stretch w-full",
                !isPro ? "cursor-pointer" : ""
              )}
            >
              <Tilt 
                rotationFactor={4} 
                className={cn(
                  "p-6 md:p-8 space-y-4 bg-card/20 border border-border transition-all duration-300 relative group overflow-hidden flex flex-col justify-between grow w-full",
                  "hover:bg-secondary/35"
                )}
              >
                <div className="flex justify-between items-center text-xs font-mono z-10">
                  <span className="text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-semibold text-[10px]">
                    <span className={cn("h-2 w-2 rounded-full", isPro ? "bg-emerald-500" : "bg-emerald-500 animate-pulse")} /> Smart Forecasting
                  </span>
                  <span className="font-bold text-foreground bg-secondary px-2.5 py-0.5 text-[10px] uppercase font-mono border border-border">
                    {isPro ? (
                      <PrivacyValue>{currencySymbol}{estimatedFinalBalance.toFixed(2)} Est.</PrivacyValue>
                    ) : (
                      "PRO_LOCKED"
                    )}
                  </span>
                </div>

                <div className="space-y-2 z-10">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-mono">End-of-Cycle Surplus</span>
                    <span className="text-xl md:text-2xl font-mono font-bold tracking-tight text-foreground">
                      {isPro ? (
                        <PrivacyValue>{currencySymbol}{estimatedFinalBalance.toFixed(2)}</PrivacyValue>
                      ) : (
                        <span className="text-emerald-500 font-extrabold tracking-widest text-lg animate-pulse">PRO REQUIRED</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
                    <span>{isPro ? "Based on 7-day velocity decay" : "Velocity analysis gated"}</span>
                    <span className={cn("font-semibold flex items-center gap-1", isPro ? (onTrack ? "text-emerald-500" : "text-amber-500") : "text-emerald-500 animate-pulse")}>
                      {isPro ? (onTrack ? "Optimal" : "High Burn") : "Activate"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono z-10">
                  {isPro 
                    ? "Learns from daily spending shifts to forecast your exact cash position before cycle close." 
                    : "Upgrade to PRO to unlock advanced machine-learned velocity forecasting."}
                </p>
              </Tilt>
            </div>
          </div>

          {/* AI Strategy Insights */}
          <section className="space-y-4">
            <LegerAIIntelligence 
              cycleData={{
                currentBalance: cycleEndBalance,
                velocity,
                categories: spendingByCategory.filter(c => c.value > 0),
                totalIn,
                totalOut,
                spendingLimit: targetMonthlySpend
              }} 
            />
          </section>

          {/* AI Projection Overrides Console */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-2 flex-wrap gap-4">
              <div className="space-y-0.5">
                <span className="technical-label">AI Projection Overrides</span>
                <p className="text-[8px] uppercase font-mono text-muted-foreground opacity-60">Manage spending velocity overrides</p>
              </div>
              {isPro && overrides.length > 0 && (
                <button 
                  onClick={clearAllOverrides}
                  className="px-2 py-0.5 bg-transparent hover:bg-destructive/10 text-destructive border border-destructive/20 font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer select-none font-bold"
                >
                  Reset
                </button>
              )}
            </div>

            {!isPro ? (
              <div className="border border-border p-6 bg-card/10 relative overflow-hidden flex flex-col items-center justify-center text-center backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                    <Sparkles className="h-2.5 w-2.5 animate-pulse" /> PRO Locked
                  </div>
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">AI Scenario Override Dashboard Locked</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-sans font-medium">
                    Upgrade to LEGER_OS PRO to manage your custom natural language projection overrides.
                  </p>
                  <Button 
                    onClick={() => {
                      setSettingsActiveTab("pro");
                      setSubscriptionOnly(true);
                      setSettingsOpen(true);
                    }}
                    className="h-7 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-[9px] uppercase font-bold tracking-wider px-4"
                  >
                    Unlock AI Engine
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Manual Adjuster Form */}
                <form onSubmit={handleAddManualOverride} className="border border-border p-4 bg-card/25 space-y-4">
                  <div className="technical-label text-[8px] opacity-40 uppercase">Manual Adjuster Input</div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono uppercase text-muted-foreground block font-bold tracking-wider">Select Target</label>
                      <div className="relative">
                        <select 
                          value={manualCategory} 
                          onChange={(e) => setManualCategory(e.target.value)}
                          className="w-full bg-secondary/35 border border-border/30 px-3 py-2 pr-8 text-[10px] font-mono outline-none focus:border-border/80 focus:bg-secondary/50 transition-all text-foreground appearance-none"
                        >
                          <option value="global">GLOBAL VELOCITY</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id.toString()}>{c.name.toUpperCase()}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-mono uppercase text-muted-foreground block font-bold tracking-wider">Direction</label>
                      <div className="relative">
                        <select 
                          value={manualDirection} 
                          onChange={(e) => setManualDirection(e.target.value)}
                          className="w-full bg-secondary/35 border border-border/30 px-3 py-2 pr-8 text-[10px] font-mono outline-none focus:border-border/80 focus:bg-secondary/50 transition-all text-foreground appearance-none"
                        >
                          <option value="decrease">DECREASE SPEND</option>
                          <option value="increase">INCREASE SPEND</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="space-y-1 w-20 shrink-0">
                      <label className="text-[8px] font-mono uppercase text-muted-foreground block font-bold tracking-wider">Percentage</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="999" 
                        required 
                        placeholder="%" 
                        value={manualPercent}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 3)
                          setManualPercent(val)
                        }}
                        className="w-full bg-secondary/35 border border-border/30 px-2 py-2 text-[10px] font-mono outline-none focus:border-border/80 focus:bg-secondary/50 transition-all text-foreground text-center"
                      />
                    </div>

                    <div className="space-y-1 flex-1">
                      <label className="text-[8px] font-mono uppercase text-muted-foreground block font-bold tracking-wider">Reason</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Hybrid work" 
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        className="w-full bg-secondary/35 border border-border/30 px-3 py-2 text-[10px] font-mono outline-none focus:border-border/80 focus:bg-secondary/50 transition-all text-foreground"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[9px] uppercase font-bold tracking-widest transition-colors cursor-pointer select-none"
                  >
                    Apply Override
                  </button>
                </form>

                {/* List of active overrides */}
                {overrides.length === 0 ? (
                  <div className="border border-border/40 ledger-border p-4 bg-card/5 text-center text-muted-foreground opacity-60 font-mono text-[8px] uppercase">
                    No active adjusters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overrides.map((ov: any, idx: number) => {
                      const direction = (ov.multiplier ?? 1.0) >= 1.0 ? "UP" : "DOWN"
                      const percent = Math.abs(Math.round(((ov.multiplier ?? 1.0) - 1.0) * 100))
                      return (
                        <div key={idx} className="border border-border ledger-border p-3.5 bg-card/20 flex flex-col justify-between space-y-2.5 font-mono">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                {ov.categoryName ? `Category: ${ov.categoryName}` : "Global Adjusted Mode"}
                              </span>
                              <p className="text-[10px] font-bold uppercase tracking-tight text-foreground">
                                {direction === "UP" ? `+${percent}%` : `-${percent}%`} Velocity
                              </p>
                            </div>
                            <button 
                              onClick={() => deleteOverride(ov.categoryId || "")}
                              className="text-[8px] text-muted-foreground hover:text-destructive hover:border-destructive/40 border border-border px-1.5 py-0.5 transition-colors cursor-pointer uppercase select-none font-bold"
                            >
                              Disable
                            </button>
                          </div>
                          <div className="border-t border-border/40 pt-1.5 opacity-75">
                            <p className="text-[8px] text-muted-foreground leading-relaxed uppercase">
                              Reason: "{ov.reason || "Applied via overrides console."}"
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Mainframe System Logs Telemetry Feed */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-foreground/10 pb-2 flex-wrap justify-between">
               <span className="technical-label">System Activity Log</span>
               {!isPro && (
                 <span className="text-[8px] font-mono text-emerald-500 font-bold uppercase tracking-wider animate-pulse">PRO GATED</span>
               )}
            </div>
            <div className="relative border border-border bg-card/20 p-4 font-mono text-[9px] md:text-[10px] space-y-2 min-h-[11rem] max-h-[500px] overflow-y-auto scrollbar-hide">
               {isPro ? (
                  systemLogs.map((log, idx) => (
                     <div key={idx} className="flex gap-3 hover:bg-secondary/20 py-1.5 px-2 items-start font-mono text-[9px] md:text-[10px] border-b border-border/10 last:border-b-0">
                         <span className="text-muted-foreground select-none shrink-0 font-bold">{log.date}</span>
                         <span className="text-foreground/80 leading-relaxed">{log.text}</span>
                     </div>
                  ))
               ) : (
                 <div 
                   onClick={() => {
                     setSettingsActiveTab("pro");
                     setSubscriptionOnly(true);
                     setSettingsOpen(true);
                   }}
                   className="absolute inset-0 bg-background/95 backdrop-blur-[6px] flex flex-col items-center justify-center p-4 text-center cursor-pointer select-none hover:bg-secondary/20 hover:border-foreground/10 transition-all duration-300"
                 >
                   <div className="space-y-1.5 max-w-sm">
                     <p className="font-mono text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Activity Log Locked</p>
                     <p className="text-[10px] text-muted-foreground leading-normal uppercase">
                       Upgrade to PRO to unlock real-time cash flow anomaly detection.
                     </p>
                   </div>
                 </div>
               )}
            </div>
          </section>

        </div>

      </div>
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
  )
}
