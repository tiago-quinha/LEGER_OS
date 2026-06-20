"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, ChevronLeft, ChevronRight, Landmark, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"

interface BudgetsViewProps {
  categories: any[]
  budgets: any[]
  expenses: any[]
  cycles: any[]
  currentCycleId: string
}

export function BudgetsView({ categories, budgets: initialBudgets, expenses, cycles, currentCycleId }: BudgetsViewProps) {
  const router = useRouter()
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

  const currentCycle = cycles.find(c => c.id === currentCycleId) || cycles[0]
  const currentIndex = cycles.findIndex(c => c.id === currentCycleId)
  
  // Calculate month and year for budget savings
  const startDate = currentCycle ? new Date(currentCycle.startDate) : new Date()
  const cycleMonth = startDate.getMonth() // 0-indexed
  const cycleYear = startDate.getFullYear()

  const navigateCycle = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (cycles[nextIndex]) {
      router.push(`/budgets?cycleId=${cycles[nextIndex].id}`)
    }
  }

  const handleBudgetChange = (categoryId: string, value: string) => {
    setEditingBudgets(prev => ({ ...prev, [categoryId]: value }))
  }

  const handleSaveBudget = async (categoryId: string) => {
    const amount = parseFloat(editingBudgets[categoryId]) || 0
    const existingBudget = budgets.find(b => b.category_id === categoryId)

    let error
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
      if (data) {
        setBudgets(prev => [...prev, data[0]])
      }
    }

    if (error) {
      toast.error("Failed to save budget")
      console.error(error)
    } else {
      toast.success("Budget updated")
      if (existingBudget) {
        setBudgets(prev => prev.map(b => b.id === existingBudget.id ? { ...b, amount } : b))
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6 w-full pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Landmark className="h-3 w-3" />
            <span>Budgets allocation // Targets Matrix</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase leading-none">
            Monthly Budgets
          </h1>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10">
        {/* Create Target Vector Card */}
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-border hover:border-foreground/40 hover:bg-secondary/10 transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[220px] rounded-lg group"
          >
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all mb-3" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">Create Budget Target</span>
            <span className="text-[9px] text-muted-foreground uppercase mt-1">Add new category limit</span>
          </button>
        ) : (
          <Card className="border-border border-2 rounded-lg relative overflow-hidden flex flex-col group min-h-[220px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
                <span>New Target Node</span>
                <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground text-xs uppercase font-mono">Cancel</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
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
                  <Label htmlFor="newCatLimit" className="text-[9px] font-mono uppercase text-muted-foreground">Monthly Limit (€)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input 
                      id="newCatLimit"
                      type="number"
                      step="0.01"
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
          const spent = expenses
            .filter(exp => exp.category_id === cat.id)
            .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
          
          const progress = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0
          const isOverBudget = spent > budgetAmount && budgetAmount > 0

          return (
            <Tilt key={cat.id} rotationFactor={5} className="bg-card border border-border rounded-lg relative overflow-hidden flex flex-col group transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                  </div>
                  {isOverBudget && (
                    <GlowingBadge variant="error" pulse dot className="scale-75 origin-right px-2 py-0.5">
                      Over Budget
                    </GlowingBadge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 z-10">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent: €{spent.toFixed(2)}</span>
                    <span className="font-medium text-foreground">Target: €{budgetAmount.toFixed(2)}</span>
                  </div>
                  <Progress value={progress} className={isOverBudget ? "bg-destructive/20" : ""} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 h-9"
                      value={editingBudgets[cat.id]}
                      onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                    />
                  </div>
                  <MagneticButton size="icon" variant="ghost" className="h-9 w-9 flex items-center justify-center rounded-lg" onClick={() => handleSaveBudget(cat.id)} strength={0.35}>
                    <Save className="h-4 w-4" />
                  </MagneticButton>
                </div>
              </CardContent>
              <ClippedCircle circleClassName="bg-white/10 dark:bg-zinc-800/20" circleSize={400} />
            </Tilt>
          )
        })}
      </div>
    </div>
  )
}
