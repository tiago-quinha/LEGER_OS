"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useCycleSwipe } from "@/hooks/useCycleSwipe"
import { CycleMobileBar } from "@/components/ui/cycle-mobile-bar"
import { SwipeCycleWrapper } from "@/components/ui/swipe-cycle-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import CategoriesLoading from "@/app/categories/loading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Tag, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Sliders, 
  Grid, 
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { NumberTicker } from "@/components/ui/number-ticker"
import { useSystem } from "@/lib/SystemContext"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { AuditTracePanel } from "@/components/AuditTracePanel"
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

interface Category {
  id: number
  name: string
  color: string
  icon?: string
}

interface Cycle {
  id: string
  label: string
  startDate: string
  endDate: string | null
  paycheckAmount: number
}

interface Expense {
  id: string
  amount: string | number
  merchant: string
  date: string
  source: string
  category_id?: number | null
  raw_text?: string
  is_anomaly?: boolean
}

interface CategoriesViewProps {
  expenses: Expense[]
  categories: Category[]
  cycles: Cycle[]
  currentCycleId?: string
}

type DatePreset = "cycle" | "30days" | "90days" | "ytd" | "all" | "custom"
type GraphMode = "cumulative" | "daily"

export function CategoriesView({ expenses, categories, cycles, currentCycleId }: CategoriesViewProps) {
  const router = useRouter()
  const { currencySymbol, setAuditPanelOpen, setActiveTransactionId } = useSystem()

  // --- States ---
  const [isPending, startTransition] = useTransition()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL")
  const [datePreset, setDatePreset] = useState<DatePreset>("cycle")
  const [selectedCycleId, setSelectedCycleId] = useState<string>(currentCycleId || cycles[0]?.id || "ALL")

  useEffect(() => {
    if (currentCycleId) {
      setSelectedCycleId(currentCycleId)
    }
  }, [currentCycleId])
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  const currentCycle = cycles.find(c => c.id === selectedCycleId) || cycles[0]
  const currentIndex = cycles.findIndex(c => c.id === (currentCycle?.id || ""))

  const handleCycleSelect = (newCycleId: string) => {
    setSelectedCycleId(newCycleId)
    startTransition(() => {
      router.replace(`/categories?cycleId=${newCycleId}`, { scroll: false })
    })
  }

  const navigateCycle = (dir: 'prev' | 'next') => {
    if (currentIndex === -1) return
    const targetIndex = dir === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (targetIndex >= 0 && targetIndex < cycles.length) {
      handleCycleSelect(cycles[targetIndex].id)
    }
  }

  useCycleSwipe({
    cycles,
    currentCycleId: selectedCycleId,
    route: "/categories",
    onCycleChange: handleCycleSelect,
  })
  const [typeFilter, setTypeFilter] = useState<"all" | "inflow" | "outflow">("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [graphMode, setGraphMode] = useState<GraphMode>("cumulative")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 15

  // Fetch details of selected category
  const selectedCategoryDetails = useMemo(() => {
    if (selectedCategoryId === "ALL") return null
    return categories.find(c => c.id.toString() === selectedCategoryId) || null
  }, [selectedCategoryId, categories])

  // Get active cycle object
  const activeCycle = useMemo(() => {
    return cycles.find(c => c.id === selectedCycleId) || cycles[0] || null
  }, [selectedCycleId, cycles])

  // --- Date boundaries calculation ---
  const dateBoundaries = useMemo(() => {
    const today = new Date()
    let start = new Date(0)
    let end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    if (datePreset === "cycle" && activeCycle) {
      start = new Date(activeCycle.startDate)
      if (activeCycle.endDate) {
        end = new Date(activeCycle.endDate)
      } else {
        // Active cycle with no end date runs up to tomorrow/present
        end = new Date()
        end.setDate(end.getDate() + 1)
      }
    } else if (datePreset === "all") {
      if (expenses.length > 0) {
        const sortedAll = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        start = new Date(sortedAll[0].date)
      } else {
        start = new Date()
        start.setDate(today.getDate() - 30)
      }
    } else if (datePreset === "30days") {
      start = new Date()
      start.setDate(today.getDate() - 30)
    } else if (datePreset === "90days") {
      start = new Date()
      start.setDate(today.getDate() - 90)
    } else if (datePreset === "ytd") {
      start = new Date(today.getFullYear(), 0, 1)
    } else if (datePreset === "custom") {
      if (customStartDate) start = new Date(customStartDate)
      if (customEndDate) {
        end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
      }
    }

    return { start, end }
  }, [datePreset, activeCycle, customStartDate, customEndDate, expenses])

  // --- Filtered Expenses for statistics & table ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Category Filter
      if (selectedCategoryId !== "ALL") {
        if (exp.category_id?.toString() !== selectedCategoryId) return false
      }

      // 2. Date Filter
      const expDate = new Date(exp.date)
      if (expDate < dateBoundaries.start || expDate > dateBoundaries.end) return false

      // 3. Type Filter
      const amt = Number(exp.amount) || 0
      if (typeFilter === "inflow" && amt <= 0) return false
      if (typeFilter === "outflow" && amt >= 0) return false

      // 4. Search Filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase()
        const merchantMatch = exp.merchant?.toLowerCase().includes(query)
        const rawTextMatch = exp.raw_text?.toLowerCase().includes(query)
        if (!merchantMatch && !rawTextMatch) return false
      }

      return true
    })
  }, [expenses, selectedCategoryId, dateBoundaries, typeFilter, searchQuery])

  // --- Reset page when filters change ---
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategoryId, datePreset, selectedCycleId, typeFilter, searchQuery])

  // --- Metrics Aggregation ---
  const metrics = useMemo(() => {
    let inflow = 0
    let outflow = 0

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0
      if (amt > 0) {
        inflow += amt
      } else {
        outflow += Math.abs(amt)
      }
    })

    const net = inflow - outflow

    return {
      inflow,
      outflow,
      net
    }
  }, [filteredExpenses])

  // --- Graph Data Generation ---
  // Note: For the graph, we want to look at ALL transactions matching category & date (ignoring search/type filter for complete visual trend)
  const graphData = useMemo(() => {
    const baseTxs = expenses.filter(exp => {
      if (selectedCategoryId !== "ALL" && exp.category_id?.toString() !== selectedCategoryId) return false
      const expDate = new Date(exp.date)
      return expDate >= dateBoundaries.start && expDate <= dateBoundaries.end
    })

    if (baseTxs.length === 0) return []

    // Sort chronologically (oldest first)
    const sortedTxs = [...baseTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const totalDays = Math.ceil((dateBoundaries.end.getTime() - dateBoundaries.start.getTime()) / (1000 * 60 * 60 * 24))

    let result = []

    // If date range is longer than 60 days, group by month to keep chart clean. Otherwise, group by day.
    if (totalDays > 60) {
      // Group by calendar month
      const monthlyBuckets: { [key: string]: { label: string; date: Date; outflow: number; inflow: number } } = {}

      sortedTxs.forEach(tx => {
        const d = new Date(tx.date)
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`
        const amt = Number(tx.amount) || 0
        
        if (!monthlyBuckets[key]) {
          monthlyBuckets[key] = {
            label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
            date: new Date(d.getFullYear(), d.getMonth(), 1),
            outflow: 0,
            inflow: 0
          }
        }

        if (amt < 0) {
          monthlyBuckets[key].outflow += Math.abs(amt)
        } else {
          monthlyBuckets[key].inflow += amt
        }
      })

      const sortedKeys = Object.keys(monthlyBuckets).sort()
      let cumOutflow = 0
      let cumInflow = 0

      result = sortedKeys.map(key => {
        const item = monthlyBuckets[key]
        cumOutflow += item.outflow
        cumInflow += item.inflow
        return {
          dateLabel: item.label,
          outflow: item.outflow,
          inflow: item.inflow,
          net: item.inflow - item.outflow,
          cumOutflow,
          cumInflow,
          cumNet: cumInflow - cumOutflow
        }
      })
    } else {
      // Daily grouping
      const dailyBuckets: { [key: string]: { label: string; date: Date; outflow: number; inflow: number } } = {}
      
      // Seed all days in range to show smooth continuous lines
      const tempDate = new Date(dateBoundaries.start)
      let safetyCounter = 0
      while (tempDate <= dateBoundaries.end && safetyCounter < 120) {
        const key = tempDate.toISOString().split("T")[0]
        dailyBuckets[key] = {
          label: tempDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          date: new Date(tempDate),
          outflow: 0,
          inflow: 0
        }
        tempDate.setDate(tempDate.getDate() + 1)
        safetyCounter++
      }

      sortedTxs.forEach(tx => {
        const key = tx.date.split("T")[0]
        const amt = Number(tx.amount) || 0
        
        if (!dailyBuckets[key]) {
          const d = new Date(tx.date)
          dailyBuckets[key] = {
            label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
            date: d,
            outflow: 0,
            inflow: 0
          }
        }

        if (amt < 0) {
          dailyBuckets[key].outflow += Math.abs(amt)
        } else {
          dailyBuckets[key].inflow += amt
        }
      })

      const sortedKeys = Object.keys(dailyBuckets).sort()
      let cumOutflow = 0
      let cumInflow = 0

      result = sortedKeys.map(key => {
        const item = dailyBuckets[key]
        cumOutflow += item.outflow
        cumInflow += item.inflow
        return {
          dateLabel: item.label,
          outflow: item.outflow,
          inflow: item.inflow,
          net: item.inflow - item.outflow,
          cumOutflow,
          cumInflow,
          cumNet: cumInflow - cumOutflow
        }
      })
    }

    // Single point fallback padding: If result array has only 1 point, prepend a 0-baseline start point
    if (result.length === 1) {
      const single = result[0]
      const startDateObj = new Date(dateBoundaries.start)
      // Prepend 1 day prior for clean horizontal axis spacing
      startDateObj.setDate(startDateObj.getDate() - 1)
      const startLabel = startDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })

      return [
        {
          dateLabel: startLabel !== single.dateLabel ? startLabel : "Start",
          outflow: 0,
          inflow: 0,
          net: 0,
          cumOutflow: 0,
          cumInflow: 0,
          cumNet: 0
        },
        single
      ]
    }

    return result
  }, [expenses, selectedCategoryId, dateBoundaries, datePreset])

  // --- zeroOffset calculation for gradient charts ---
  const zeroOffset = useMemo(() => {
    if (graphData.length === 0) return 0.5
    const values = graphMode === "cumulative" 
      ? graphData.map(d => d.cumNet)
      : graphData.map(d => d.net)
    
    // Filter out any NaN or undefined values just in case
    const cleanValues = values.filter(v => typeof v === "number" && !isNaN(v))
    if (cleanValues.length === 0) return 0.5

    const maxVal = Math.max(...cleanValues)
    const minVal = Math.min(...cleanValues)
    
    if (maxVal === minVal) return 0.5
    if (maxVal <= 0) return 0
    if (minVal >= 0) return 1
    
    const diff = maxVal - minVal
    if (isNaN(diff) || diff === 0) return 0.5
    return maxVal / diff
  }, [graphData, graphMode])

  // --- Category Quick Stats (for the cards selection grid) ---
  const categoryQuickStats = useMemo(() => {
    return categories.map(cat => {
      let catInflow = 0
      let catOutflow = 0

      expenses.forEach(exp => {
        if (exp.category_id !== cat.id) return
        const expDate = new Date(exp.date)
        if (expDate < dateBoundaries.start || expDate > dateBoundaries.end) return

        const amt = Number(exp.amount) || 0
        if (amt > 0) {
          catInflow += amt
        } else {
          catOutflow += Math.abs(amt)
        }
      })

      return {
        ...cat,
        inflow: catInflow,
        outflow: catOutflow,
        net: catInflow - catOutflow
      }
    }).sort((a, b) => b.outflow - a.outflow) // Sort by highest spend first
  }, [categories, expenses, dateBoundaries])

  // --- Total stats for "ALL" selection ---
  const totalQuickStats = useMemo(() => {
    let inflow = 0
    let outflow = 0

    expenses.forEach(exp => {
      const expDate = new Date(exp.date)
      if (expDate < dateBoundaries.start || expDate > dateBoundaries.end) return
      
      const amt = Number(exp.amount) || 0
      if (amt > 0) {
        inflow += amt
      } else {
        outflow += Math.abs(amt)
      }
    })

    return {
      inflow,
      outflow,
      net: inflow - outflow
    }
  }, [expenses, dateBoundaries])

  // --- Pagination ---
  const totalPages = Math.ceil(filteredExpenses.length / pageSize)
  const paginatedExpenses = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filteredExpenses.slice(startIdx, startIdx + pageSize)
  }, [filteredExpenses, currentPage])

  const openAudit = (id: string) => {
    setActiveTransactionId(id)
    setAuditPanelOpen(true)
  }

  // Accent color for graph based on category
  const activeColor = selectedCategoryDetails?.color || "var(--foreground)"

  return (
    <SwipeCycleWrapper
      cycles={cycles}
      currentCycleId={selectedCycleId}
      route="/categories"
      onCycleChange={handleCycleSelect}
    >
      {isPending ? (
        <CategoriesLoading />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full"
        >
        {/* 1. Header */}
      <header className="flex items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8 relative flex-wrap sm:flex-nowrap">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            <span>Category Explorer {currentCycle ? `[${currentCycle.label.replace('Cycle: ', '')}]` : ''}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Categories
          </h1>
        </div>

        {cycles.length > 0 && (
          <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
            <button 
              onClick={() => navigateCycle('prev')} 
              disabled={currentIndex >= cycles.length - 1} 
              className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 border-r border-border cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous paycheck cycle"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button 
              onClick={() => navigateCycle('next')} 
              disabled={currentIndex <= 0} 
              className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next paycheck cycle"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}
      </header>

      <div className="space-y-10 md:space-y-12">
        {/* 2. Interactive Category Grid */}
        <section className="space-y-4">
        <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
          <h2 className="technical-label">Category Matrix</h2>
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            {categories.length + 1} ACTIVE ENTITIES
          </span>
        </div>
        
        {/* Horizontal scroll on mobile, responsive grid on desktop */}
        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-x-auto pb-3 md:pb-0 scrollbar-thin scrollbar-thumb-border">
          {/* ALL Categories Card */}
          <div
            onClick={() => setSelectedCategoryId("ALL")}
            className={cn(
              "flex-shrink-0 w-[160px] md:w-auto text-left border p-3.5 bg-card/40 transition-all relative overflow-hidden group select-none flex flex-col justify-between min-h-[95px] cursor-pointer hover:border-foreground/50",
              selectedCategoryId === "ALL" 
                ? "border-foreground shadow-sm bg-secondary/35" 
                : "border-border"
            )}
          >
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5">
                <Grid className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-bold text-[11px] uppercase tracking-tight truncate max-w-[100px]">ALL CATEGORIES</span>
              </div>
              {selectedCategoryId === "ALL" && (
                <div className="h-1.5 w-1.5 bg-foreground rounded-full" />
              )}
            </div>
            
            <div className="mt-4 z-10">
              <span className="technical-label text-[8px] opacity-45 block">NET POSITION</span>
              <span className={cn("font-mono font-bold text-sm tracking-tight", totalQuickStats.net >= 0 ? "text-emerald-500" : "text-destructive")}>
                {totalQuickStats.net >= 0 ? "+" : ""}{currencySymbol}{Math.round(totalQuickStats.net)}
              </span>
            </div>
          </div>

          {/* Individual Category Cards */}
          {categoryQuickStats.map(cat => {
            const isSelected = selectedCategoryId === cat.id.toString()
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id.toString())}
                className={cn(
                  "flex-shrink-0 w-[160px] md:w-auto text-left border p-3.5 bg-card/40 transition-all relative overflow-hidden group select-none flex flex-col justify-between min-h-[95px] cursor-pointer hover:border-foreground/50",
                  isSelected 
                    ? "border-foreground shadow-sm bg-secondary/35" 
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between z-10 w-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-bold text-[11px] uppercase tracking-tight truncate max-w-[100px] text-foreground">
                      {cat.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  )}
                </div>

                <div className="mt-4 z-10">
                  <span className="technical-label text-[8px] opacity-45 block">NET POSITION</span>
                  <span className={cn("font-mono font-bold text-sm tracking-tight", cat.net >= 0 ? "text-emerald-500" : "text-destructive")}>
                    {cat.net >= 0 ? "+" : ""}{currencySymbol}{Math.round(cat.net)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Metrics Summary Bento Grid (Outflow, Inflow, Net) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Profit/Loss Card */}
        <Tilt rotationFactor={4} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="technical-label text-[8px] md:text-[9px]">Net Position</span>
            <ArrowLeftRight className={cn("h-3.5 w-3.5", metrics.net >= 0 ? "text-emerald-500" : "text-destructive")} />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">NET POSITION</span>
            <div className={cn("text-2xl lg:text-3xl font-mono font-bold tracking-tighter", metrics.net >= 0 ? "text-emerald-500" : "text-destructive")}>
              <PrivacyValue>
                <span>{metrics.net >= 0 ? "+" : ""}{currencySymbol}{metrics.net.toFixed(2)}</span>
              </PrivacyValue>
            </div>
          </div>
          <p className="text-[8px] md:text-[9px] font-mono uppercase tracking-widest font-bold">
            <span className={cn(
              "px-1.5 py-0.5 border text-[8px] font-mono",
              metrics.net >= 0 
                ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" 
                : "text-destructive border-destructive/20 bg-destructive/5"
            )}>
              {metrics.net >= 0 ? "Surplus" : "Deficit"}
            </span>
          </p>
        </Tilt>

        {/* Inflow Card */}
        <Tilt rotationFactor={4} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="technical-label text-[8px] md:text-[9px]">Inflow</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">TOTAL INFLOW</span>
            <div className="text-2xl lg:text-3xl font-mono font-bold tracking-tighter text-foreground">
              <PrivacyValue>
                <NumberTicker value={metrics.inflow} prefix={currencySymbol} />
              </PrivacyValue>
            </div>
          </div>
          <p className="text-[8px] md:text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            {filteredExpenses.filter(e => (Number(e.amount) || 0) > 0).length} Credit Records
          </p>
        </Tilt>

        {/* Outflow Card */}
        <Tilt rotationFactor={4} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="technical-label text-[8px] md:text-[9px]">Outflow</span>
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">TOTAL SPENDING</span>
            <div className="text-2xl lg:text-3xl font-mono font-bold tracking-tighter text-foreground">
              <PrivacyValue>
                <NumberTicker value={metrics.outflow} prefix={currencySymbol} />
              </PrivacyValue>
            </div>
          </div>
          <p className="text-[8px] md:text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            {filteredExpenses.filter(e => (Number(e.amount) || 0) < 0).length} Debit Records
          </p>
        </Tilt>
      </section>

      {/* 4. Controls, Date Filter, and Trend Graph (Split Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start [content-visibility:auto] [contain-intrinsic-size:1px_500px]">
        {/* Left Side: Filter Matrix Block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h2 className="technical-label">Filters</h2>
            <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="border border-border ledger-border bg-card/30 p-5 space-y-5 font-mono text-xs">
            {/* Category Dropdown (Alternative to clicking Cards) */}
            <div className="space-y-1.5">
              <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Selected Category</Label>
              <div className="relative">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full h-10 px-3 pr-10 border border-border bg-card rounded-none uppercase text-foreground outline-none focus:border-foreground transition-colors appearance-none"
                >
                  <option value="ALL" className="bg-[#121215] text-foreground font-mono py-1">ALL CATEGORIES</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#121215] text-foreground font-mono py-1">{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Date Preset */}
            <div className="space-y-1.5">
              <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Temporal Window</Label>
              <div className="relative">
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="w-full h-10 px-3 pr-10 border border-border bg-card rounded-none uppercase text-foreground outline-none focus:border-foreground transition-colors appearance-none"
                >
                  <option value="cycle" className="bg-[#121215] text-foreground font-mono py-1">Paycheck Cycle</option>
                  <option value="30days" className="bg-[#121215] text-foreground font-mono py-1">Last 30 Days</option>
                  <option value="90days" className="bg-[#121215] text-foreground font-mono py-1">Last 90 Days</option>
                  <option value="ytd" className="bg-[#121215] text-foreground font-mono py-1">Year to Date (YTD)</option>
                  <option value="all" className="bg-[#121215] text-foreground font-mono py-1">All Time</option>
                  <option value="custom" className="bg-[#121215] text-foreground font-mono py-1">Custom Range</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Cycle Selector (only if Preset is 'cycle') */}
            {datePreset === "cycle" && cycles.length > 0 && (
              <div className="space-y-1.5">
                <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Select Active Cycle</Label>
                <div className="relative">
                  <select
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    className="w-full h-10 px-3 pr-10 border border-border bg-card rounded-none uppercase text-foreground outline-none focus:border-foreground transition-colors text-[10px] appearance-none"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#121215] text-foreground font-mono py-1">{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Custom Dates (only if Preset is 'custom') */}
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-none h-10 border-border bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-none h-10 border-border bg-card"
                  />
                </div>
              </div>
            )}

            {/* Transaction Type Filter */}
            <div className="space-y-1.5">
              <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Record Type</Label>
              <div className="grid grid-cols-3 border border-border bg-card p-0.5">
                {[
                  { value: "all", label: "ALL" },
                  { value: "outflow", label: "DEBIT" },
                  { value: "inflow", label: "CREDIT" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value as any)}
                    className={cn(
                      "py-1.5 text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer",
                      typeFilter === opt.value 
                        ? "bg-foreground text-background" 
                        : "hover:bg-secondary/40 text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant / Text Search */}
            <div className="space-y-1.5">
              <Label className="technical-label text-[9px] text-muted-foreground uppercase font-bold">Search Matcher</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. UBER, SALARY..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-none h-10 border-border pl-8 text-xs uppercase bg-card"
                />
                <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Graph Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h2 className="technical-label">
              Trajectory Graph: {selectedCategoryId === "ALL" ? "Global" : `${selectedCategoryDetails?.name}`}
            </h2>
            <div className="flex items-center gap-2 border border-border p-0.5 bg-card text-[9px] font-mono">
              <button 
                onClick={() => setGraphMode("cumulative")}
                className={cn("px-2 py-1 uppercase font-bold", graphMode === "cumulative" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                Cumulative
              </button>
              <button 
                onClick={() => setGraphMode("daily")}
                className={cn("px-2 py-1 uppercase font-bold", graphMode === "daily" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                Interval
              </button>
            </div>
          </div>

          <div className="h-[320px] md:h-[350px] w-full border border-border ledger-border p-4 bg-card relative overflow-hidden flex flex-col justify-center">
            {graphData.length === 0 ? (
              <div className="text-center text-muted-foreground font-mono uppercase text-xs">
                Insufficient data points in selected temporal window.
              </div>
            ) : (
              <div className="h-[270px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  {graphMode === "cumulative" ? (
                    <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={0.15}/>
                        </linearGradient>
                        <linearGradient id="strokeNetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={1}/>
                          <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="activeCategoryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeColor} stopOpacity={0.08}/>
                          <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis 
                        dataKey="dateLabel" 
                        axisLine={false} 
                        tickLine={false} 
                        style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                        tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                        wrapperStyle={{ outline: 'none' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-card border border-border p-3 font-mono text-[9px] md:text-[10px] space-y-1.5 shadow-sm z-50 text-foreground">
                                <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
                                <p className="flex justify-between gap-8 uppercase">
                                  <span>Cum. Outflow:</span> 
                                  <span className="text-muted-foreground">{currencySymbol}{data.cumOutflow.toFixed(2)}</span>
                                </p>
                                <p className="flex justify-between gap-8 uppercase">
                                  <span>Cum. Inflow:</span> 
                                  <span className="text-emerald-500">{currencySymbol}{data.cumInflow.toFixed(2)}</span>
                                </p>
                                <p className={cn("flex justify-between gap-8 uppercase font-bold border-t border-border pt-1 mt-1", data.cumNet >= 0 ? "text-emerald-500" : "text-destructive")}>
                                  <span>Net Position:</span> 
                                  <span>{data.cumNet >= 0 ? "+" : ""}{currencySymbol}{data.cumNet.toFixed(2)}</span>
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
                      {/* Show category outflow in category's color if single category is selected */}
                      {selectedCategoryId !== "ALL" && (
                        <Area 
                          type="monotone" 
                          dataKey="cumOutflow" 
                          stroke={activeColor} 
                          strokeWidth={1.5} 
                          fill="url(#activeCategoryGrad)"
                          name="Cumulative Spent"
                        />
                      )}
                      <Area 
                        type="monotone" 
                        dataKey="cumNet" 
                        stroke="url(#strokeNetGrad)" 
                        strokeWidth={2} 
                        fill="url(#colorNetGrad)"
                        fillOpacity={1}
                        name="Cumulative Net"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={graphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis 
                        dataKey="dateLabel" 
                        axisLine={false} 
                        tickLine={false} 
                        style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
                        tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                        wrapperStyle={{ outline: 'none' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-card border border-border p-3 font-mono text-[9px] md:text-[10px] space-y-1.5 shadow-sm z-50 text-foreground">
                                <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
                                <p className="flex justify-between gap-8 uppercase text-destructive font-semibold">
                                  <span>Spend:</span> 
                                  <span>-{currencySymbol}{data.outflow.toFixed(2)}</span>
                                </p>
                                <p className="flex justify-between gap-8 uppercase text-emerald-500 font-semibold">
                                  <span>Inflow:</span> 
                                  <span>+{currencySymbol}{data.inflow.toFixed(2)}</span>
                                </p>
                                <p className={cn("flex justify-between gap-8 uppercase font-bold border-t border-border pt-1 mt-1", data.net >= 0 ? "text-emerald-500" : "text-destructive")}>
                                  <span>Net Diff:</span> 
                                  <span>{data.net >= 0 ? "+" : ""}{currencySymbol}{data.net.toFixed(2)}</span>
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
                      <Bar dataKey="inflow" name="Inflow" fill="#10b981" fillOpacity={0.15} stroke="#10b981" strokeWidth={1} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="outflow" name="Outflow" fill={activeColor} fillOpacity={0.1} stroke={activeColor} strokeWidth={1} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Detailed Transactions Table */}
      <section className="space-y-6 text-foreground">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <h2 className="technical-label">Matching Transactions</h2>
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            Showing {filteredExpenses.length} Matches
          </span>
        </div>

        <Card className="rounded-none border-border ledger-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base sm:text-lg font-mono tracking-tight">Audit Trail</CardTitle>
            <span className="text-[10px] font-mono text-muted-foreground uppercase border border-border px-2 py-0.5">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>
          </CardHeader>
          
          <CardContent className="p-0 sm:p-6">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono uppercase text-xs">
                No matching transactional packets discovered in matrix.
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] pl-4 sm:pl-6">Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead className="min-w-[120px]">Category</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-right pr-4 sm:pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => {
                      const amountVal = Number(expense.amount) || 0
                      const isExpenseInflow = amountVal > 0
                      const cat = categories.find(c => c.id === expense.category_id)

                      return (
                        <TableRow 
                          key={expense.id} 
                          onClick={() => openAudit(expense.id)}
                          className="cursor-pointer group hover:bg-secondary/40"
                        >
                          <TableCell className="text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground pl-4 sm:pl-6 whitespace-nowrap">
                            {new Date(expense.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </TableCell>
                          
                          <TableCell className="font-medium text-xs md:text-sm max-w-[150px] sm:max-w-none truncate uppercase">
                            {expense.merchant}
                          </TableCell>
                          
                          <TableCell>
                            {cat ? (
                              <div className="inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-tight select-none">
                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                {cat.name}
                              </div>
                            ) : (
                              <span className="text-[9px] font-mono text-muted-foreground/60 tracking-wider">UNCLASSIFIED</span>
                            )}
                          </TableCell>

                          <TableCell className="text-[9px] font-mono text-muted-foreground/80 uppercase hidden md:table-cell truncate max-w-[100px]">
                            {expense.source}
                          </TableCell>

                          <TableCell className={cn(
                            "text-right font-mono font-bold text-xs md:text-sm pr-4 sm:pr-6 whitespace-nowrap",
                            isExpenseInflow ? "text-emerald-500" : "text-foreground"
                          )}>
                            {isExpenseInflow ? "+" : "-"}{currencySymbol}{Math.abs(amountVal).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4 font-mono text-xs bg-card/10 select-none">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Showing {paginatedExpenses.length} of {filteredExpenses.length} matches
                </span>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-none px-3 font-bold bg-card"
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> PREV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-none px-3 font-bold bg-card"
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                    disabled={currentPage === totalPages}
                  >
                    NEXT <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Side Audit Panel portal */}
      </div>

        </motion.div>
      )}

      {/* Mobile sticky cycle nav bar (above bottom nav) */}
      <CycleMobileBar
        cycles={cycles}
        currentCycleId={selectedCycleId}
        route="/categories"
        onCycleChange={handleCycleSelect}
      />
    </SwipeCycleWrapper>
  )
}
