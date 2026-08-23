"use client"

import { useState, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useCycleSwipe } from "@/hooks/useCycleSwipe"
import { CycleMobileBar } from "@/components/ui/cycle-mobile-bar"
import { SwipeCycleWrapper } from "@/components/ui/swipe-cycle-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import BudgetsLoading from "@/app/budgets/loading"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, ChevronLeft, ChevronRight, Landmark, Plus, Edit2, Check, X, PiggyBank, PieChart } from "lucide-react"
import { cn } from "@/lib/utils"

import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { useSystem } from "@/lib/SystemContext"

interface BudgetsViewProps {
  categories: any[]
  budgets: any[]
  expenses: any[]
  cycles: any[]
  currentCycleId: string
}

export function BudgetsView({ categories, budgets: initialBudgets, expenses, cycles, currentCycleId }: BudgetsViewProps) {
  const router = useRouter()
  const { currencySymbol } = useSystem()

  const [budgets, setBudgets] = useState(initialBudgets)
  const [editingBudgets, setEditingBudgets] = useState<{ [key: string]: string }>(
    categories.reduce((acc, cat) => {
      const budget = initialBudgets.find(b => b.category_id === cat.id)
      acc[cat.id] = budget ? budget.amount.toString() : "0"
      return acc
    }, {} as { [key: string]: string })
  )

  // Sync state when page props refresh
  useEffect(() => {
    setBudgets(initialBudgets)
    setEditingBudgets(
      categories.reduce((acc, cat) => {
        const budget = initialBudgets.find(b => b.category_id === cat.id)
        acc[cat.id] = budget ? budget.amount.toString() : "0"
        return acc
      }, {} as { [key: string]: string })
    )
  }, [initialBudgets, categories])

  // New Budget Targets state
  const [isAdding, setIsAdding] = useState(false)
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [newCatLimit, setNewCatLimit] = useState("")
  const [newCatColor, setNewCatColor] = useState("#3357FF") // Default Neon Blue

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      toast.error("Please specify a category name.")
      return
    }

    const limit = parseFloat(newCatLimit) || 0
    if (limit <= 0) {
      toast.error("Please specify a budget limit greater than 0.")
      return
    }
    if (limit > 1000000) {
      toast.error("Budget limit exceeds realistic limits (max €1,000,000).")
      return
    }

    try {
      // 1. Insert category
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .insert({
          name: newCatName.trim(),
          color: newCatColor,
          icon: "Plus"
        })
        .select()

      if (catError) {
        if (catError.code === "23505") { // Unique violation check
          toast.error("A category with this name already exists.")
        } else {
          throw catError
        }
        return
      }

      const newCategory = catData[0]

      // 2. Insert budget
      const { error: budError } = await supabase
        .from("budgets")
        .insert({
          category_id: newCategory.id,
          amount: limit,
          month: cycleMonth + 1,
          year: cycleYear
        })

      if (budError) throw budError

      toast.success(`Target budget initialized for category "${newCategory.name}"`)
      setNewCatName("")
      setNewCatLimit("")
      setIsAdding(false)
      
      // Refresh props from server
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to store budget target: ${err.message}`)
    }
  }

  const [isPending, startTransition] = useTransition()
  const [selectedCycleId, setSelectedCycleId] = useState<string>(currentCycleId || cycles[0]?.id || "")

  useEffect(() => {
    if (currentCycleId) {
      setSelectedCycleId(currentCycleId)
    }
  }, [currentCycleId])

  const currentCycle = cycles.find(c => c.id === selectedCycleId) || cycles[0]
  const currentIndex = cycles.findIndex(c => c.id === (currentCycle?.id || ""))
  
  // Calculate month and year for budget savings
  const startDate = currentCycle ? new Date(currentCycle.startDate) : new Date()
  const cycleMonth = startDate.getMonth() // 0-indexed
  const cycleYear = startDate.getFullYear()

  const handleCycleSelect = (newCycleId: string) => {
    setSelectedCycleId(newCycleId)
    startTransition(() => {
      router.replace(`/budgets?cycleId=${newCycleId}`, { scroll: false })
    })
  }

  const navigateCycle = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (cycles[nextIndex]) {
      handleCycleSelect(cycles[nextIndex].id)
    }
  }

  const handleBudgetChange = (categoryId: string, value: string) => {
    setEditingBudgets(prev => ({ ...prev, [categoryId]: value }))
  }

  const handleSaveBudget = async (categoryId: string) => {
    const amount = parseFloat(editingBudgets[categoryId]) || 0
    if (amount < 0) {
      toast.error("Budget must be a non-negative number.")
      return
    }
    if (amount > 1000000) {
      toast.error("Budget amount exceeds realistic limits (max €1,000,000).")
      return
    }
    const existingBudget = budgets.find(b => b.category_id === categoryId)

    // Save previous state to revert on failure
    const previousBudgets = [...budgets]

    // Optimistically update state instantly
    if (existingBudget) {
      setBudgets(prev => prev.map(b => b.id === existingBudget.id ? { ...b, amount } : b))
    } else {
      const tempId = `temp-bud-${Date.now()}`
      setBudgets(prev => [...prev, { id: tempId, category_id: categoryId, amount, month: cycleMonth + 1, year: cycleYear }])
    }
    toast.success("Budget updated")

    let error
    let insertedData: any = null
    if (existingBudget) {
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ amount })
        .eq("id", existingBudget.id)
      error = updateError
    } else {
      const { data, error: insertError } = await supabase
        .from("budgets")
        .insert({
          category_id: categoryId,
          amount,
          month: cycleMonth + 1,
          year: cycleYear
        })
        .select()
      error = insertError
      insertedData = data?.[0]
    }

    if (error) {
      toast.error("Failed to save budget")
      setBudgets(previousBudgets)
      console.error(error)
    } else if (insertedData) {
      setBudgets(prev => prev.map(b => b.id.toString().startsWith("temp-bud-") ? insertedData : b))
    }
  }

  return (
    <SwipeCycleWrapper
      cycles={cycles}
      currentCycleId={selectedCycleId}
      route="/budgets"
      onCycleChange={handleCycleSelect}
    >
      {isPending ? (
        <BudgetsLoading />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 w-full pb-36 md:pb-8"
        >
        {/* 1. Header */}
      <header className="flex items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8 relative flex-wrap sm:flex-nowrap">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <PieChart className="h-3.5 w-3.5" />
            <span>Budget Management {currentCycle ? `[${currentCycle.label.replace('Cycle: ', '')}]` : ''}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Budgets
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

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
        {/* Create Target Vector Card */}
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-border hover:border-foreground/40 hover:bg-secondary/10 transition-all p-10 flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[220px] rounded-none group"
          >
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all mb-3" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">Create Budget Target</span>
            <span className="text-[9px] text-muted-foreground uppercase mt-1">Add new category limit</span>
          </button>
        ) : (
          <Card className="border-border ledger-border bg-card relative overflow-hidden flex flex-col group min-h-[220px]">
            <CardHeader className="p-6 sm:p-8 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
                <span>New Target Node</span>
                <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground text-xs uppercase font-mono">Cancel</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pt-0 flex-1 space-y-4">
              <form onSubmit={handleAddBudget} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="newCatName" className="text-[9px] font-mono uppercase text-muted-foreground">Category Name</Label>
                  <Input 
                    id="newCatName"
                    placeholder="e.g. Subscriptions"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newCatLimit" className="text-[9px] font-mono uppercase text-muted-foreground">Monthly Limit ({currencySymbol})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                    <Input 
                      id="newCatLimit"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="100.00"
                      value={newCatLimit}
                      onChange={(e) => setNewCatLimit(e.target.value)}
                      required
                      className="pl-7 h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Accent selection */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-mono uppercase text-muted-foreground">Accent Vector</Label>
                  <div className="flex gap-2.5">
                    {["#3357FF", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#64748B"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCatColor(color)}
                        className={cn(
                          "w-5 h-5 rounded-full border transition-transform",
                          newCatColor === color ? "scale-125 border-foreground" : "border-transparent opacity-80"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full h-9 uppercase font-mono text-[9px] tracking-wider font-bold">
                  Initialize Target
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {categories.map((cat) => {
          const budget = budgets.find(b => b.category_id === cat.id)
          const budgetAmount = budget ? parseFloat(budget.amount) : 0
          
          // Calculate net pocket balance (inflows > 0, outflows < 0)
          const netBalance = expenses
            .filter(exp => exp.category_id === cat.id)
            .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
          
          const isProfitable = netBalance > 0
          const netSpent = netBalance < 0 ? Math.abs(netBalance) : 0
          const netProfit = isProfitable ? netBalance : 0

          const progressPercent = budgetAmount > 0 
            ? (Math.abs(netBalance) / budgetAmount) * 100 
            : 0
          
          const isOverBudget = !isProfitable && netSpent > budgetAmount && budgetAmount > 0

          const isEditing = activeEditingId === cat.id

          return (
            <Tilt key={cat.id} rotationFactor={5} className="bg-card border border-border rounded-none ledger-border relative overflow-hidden flex flex-col group transition-shadow hover:shadow-lg h-full min-h-[220px]">
              <CardHeader className="p-6 sm:p-8 pb-3 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-tight truncate font-sans text-foreground">
                      {cat.name}
                    </CardTitle>
                  </div>
                  {isProfitable ? (
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">
                      +{netProfit.toFixed(2)} Surplus
                    </span>
                  ) : isOverBudget ? (
                    <span className="text-[10px] font-mono font-bold uppercase text-destructive bg-destructive/10 border border-destructive/30 px-2 py-0.5">
                      Over Target
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 pt-0 flex-1 space-y-4 z-10 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                      {isProfitable ? "Net Surplus" : "Net Spent"}
                    </span>
                    <span className={cn("font-bold text-right tabular-nums", isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                      <PrivacyValue>
                        {isProfitable ? `+${currencySymbol}${netProfit.toFixed(2)}` : `${currencySymbol}${netSpent.toFixed(2)}`}
                      </PrivacyValue>
                    </span>
                  </div>

                  <div 
                    onClick={() => !isEditing && setActiveEditingId(cat.id)}
                    className={cn(
                      "flex justify-between items-center text-xs font-mono border-b border-border/50 pb-2",
                      !isEditing && "cursor-pointer group/limit hover:border-foreground/40 transition-colors select-none"
                    )}
                    title={!isEditing ? "Click to edit budget limit" : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold group-hover/limit:text-foreground transition-colors">
                        Budget Limit
                      </span>
                      {!isEditing && (
                        <Edit2 className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover/limit:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {!isEditing ? (
                      <span className="font-bold text-right tabular-nums text-foreground group-hover/limit:underline decoration-dotted">
                        <PrivacyValue>{currencySymbol}{budgetAmount.toFixed(2)}</PrivacyValue>
                      </span>
                    ) : (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSaveBudget(cat.id)
                          setActiveEditingId(null)
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <div className="relative flex items-center">
                          <span className="text-muted-foreground text-xs font-mono select-none mr-0.5">{currencySymbol}</span>
                          <input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            className="w-20 h-6 px-1 text-right text-xs font-mono font-bold rounded-none tabular-nums bg-secondary/50 border border-foreground/50 focus:border-foreground focus:outline-none text-foreground"
                            value={editingBudgets[cat.id]}
                            onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                handleBudgetChange(cat.id, budgetAmount.toString())
                                setActiveEditingId(null)
                              }
                            }}
                            autoFocus
                          />
                        </div>
                        <button 
                          type="submit"
                          className="h-6 w-6 rounded-none border border-border bg-card hover:bg-emerald-500/20 hover:text-emerald-500 hover:border-emerald-500/40 flex items-center justify-center cursor-pointer transition-colors"
                          title="Save"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button 
                          type="button"
                          className="h-6 w-6 rounded-none border border-border bg-card hover:bg-destructive/20 hover:text-destructive flex items-center justify-center cursor-pointer transition-colors"
                          onClick={() => {
                            handleBudgetChange(cat.id, budgetAmount.toString())
                            setActiveEditingId(null)
                          }}
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mt-auto">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase">
                    <span>{isProfitable ? "Surplus Direction" : "Budget Usage"}</span>
                    <span className={cn(isProfitable ? "text-emerald-600 dark:text-emerald-400 font-bold" : isOverBudget ? "text-destructive font-bold" : "")}>
                      {isProfitable ? `+${progressPercent.toFixed(0)}% (PROFIT) →` : `← ${progressPercent.toFixed(0)}% (USED)`}
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-secondary/60 rounded-full border border-border/40 flex items-center">
                    {/* Center zero-point indicator notch */}
                    <div className="absolute left-1/2 -top-1 -bottom-1 -translate-x-1/2 w-0.5 bg-foreground dark:bg-white z-20 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-foreground dark:bg-white" />
                    </div>

                    {/* Bar fill container with overflow-hidden */}
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      {/* IF PROFITABLE (> 0): Expand Right from center in Emerald Green */}
                      {isProfitable && (
                        <div 
                          className="absolute left-1/2 top-0 bottom-0 bg-emerald-600/90 dark:bg-emerald-500/80 transition-all duration-500"
                          style={{ width: `${Math.min(50, (netProfit / (budgetAmount || 100)) * 50)}%` }}
                        />
                      )}

                      {/* IF DOWN / SPENT (< 0): Expand Left from center in Destructive/Zinc */}
                      {!isProfitable && netSpent > 0 && (
                        <div 
                          className={cn("absolute right-1/2 top-0 bottom-0 transition-all duration-500", isOverBudget ? "bg-rose-600/90 dark:bg-rose-500/85" : "bg-muted-foreground/60")}
                          style={{ width: `${Math.min(50, (netSpent / (budgetAmount || 100)) * 50)}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Tilt>
          )
        })}
      </div>

        </motion.div>
      )}

      {/* Mobile sticky cycle nav bar (above bottom nav) */}
      <CycleMobileBar
        cycles={cycles}
        currentCycleId={selectedCycleId}
        route="/budgets"
        onCycleChange={handleCycleSelect}
      />
    </SwipeCycleWrapper>
  )
}
