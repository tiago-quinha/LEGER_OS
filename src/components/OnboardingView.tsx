"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Landmark, Upload, Terminal, Sparkles, ArrowRight, Cpu, Database, Calendar, Check, Shield, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const HABIT_PRESETS = [
  { id: "groceries", name: "Supermarkets & Groceries", desc: "Pingo Doce, Continente, Lidl, Auchan", category: "Food", keywords: ["Pingo Doce", "Continente", "Lidl", "Auchan", "Mercadona"] },
  { id: "dining", name: "Dining & Food Delivery", desc: "Uber Eats, Bolt Food, McDonald's, Restaurants", category: "Food", keywords: ["Uber Eats", "Bolt Food", "McDonalds", "Burger King", "Restaurante"] },
  { id: "transport", name: "Rideshare & Transit", desc: "Uber, Bolt, CP Comboios, Metro", category: "Transport", keywords: ["Uber", "Bolt", "CP -", "Metro", "Carris"] },
  { id: "fuel", name: "Gas Stations", desc: "Galp, Repsol, BP, Prio", category: "Gas", keywords: ["Galp", "Repsol", "BP", "Prio", "Cepsa"] },
  { id: "housing", name: "Utilities & Telecom", desc: "EDP, Endesa, MEO, Vodafone, NOS", category: "Housing", keywords: ["EDP", "Endesa", "MEO", "Vodafone", "NOS"] },
  { id: "entertainment", name: "Subscriptions & Gaming", desc: "Netflix, Spotify, Steam, Cinema", category: "Entertainment", keywords: ["Netflix", "Spotify", "Steam", "Cinema"] },
]

export function OnboardingView() {
  const router = useRouter()
  const { user, refreshData } = useSystem()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Paycheck Keyword
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [keyword, setKeyword] = useState("SALARY")
  const [isSavingStep1, setIsSavingStep1] = useState(false)

  // Step 2: Habits
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "transport", "housing"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const handleCompleteStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setStep(2)
      return
    }
    setIsSavingStep1(true)
    const finalKw = cycleMode === "monthly" ? "MONTHLY" : (keyword.trim() || "SALARY")
    await supabase.from("profiles").update({ paycheck_keyword: finalKw, onboarding_completed: true }).eq("id", user.id)
    setIsSavingStep1(false)
    toast.success("Paycheck architecture saved")
    setStep(2)
  }

  const toggleHabit = (id: string) => {
    if (selectedHabits.includes(id)) {
      setSelectedHabits(selectedHabits.filter(h => h !== id))
    } else {
      setSelectedHabits([...selectedHabits, id])
    }
  }

  const handleSeedAndProceed = async () => {
    setIsSeeding(true)
    if (selectedHabits.length > 0 && categories.length > 0) {
      for (const habitId of selectedHabits) {
        const preset = HABIT_PRESETS.find(p => p.id === habitId)
        if (!preset) continue
        const catObj = categories.find(c => c.name.toLowerCase() === preset.category.toLowerCase())
        if (!catObj) continue
        for (const kw of preset.keywords) {
          await supabase.from("merchant_rules").insert({ keyword: kw, category_id: catObj.id })
        }
      }
    }
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id)
    }
    setIsSeeding(false)
    toast.success("AI categorization rules initialized!")
    setStep(3)
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 space-y-10 max-w-4xl mx-auto">
      {/* Visual Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <motion.div 
          initial={{ rotate: 0, scale: 0.9 }}
          animate={{ rotate: 45, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-16 h-16 bg-foreground flex items-center justify-center ledger-border shadow-2xl"
        >
          <Landmark className="h-8 w-8 text-background -rotate-45" />
        </motion.div>
        
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-tight">INITIALIZE LEGER_OS</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.25em] opacity-80">
            {step === 1 && "Step 01 // Paycheck Cycle Architecture"}
            {step === 2 && "Step 02 // Neural Categorization Habits"}
            {step === 3 && "Step 03 // Ready for Data Ingestion"}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 pt-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn("h-1.5 w-12 transition-all duration-300", step === s ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : step > s ? "bg-foreground" : "bg-muted")} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-xl bg-card border border-border p-6 md:p-8 space-y-6 shadow-xl"
          >
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4" /> Define Your Income Pattern
              </h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                LEGER_OS organizes budgets around financial cycles rather than arbitrary dates. Select how your primary cycle should reset:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div 
                onClick={() => setCycleMode("keyword")}
                className={cn(
                  "p-4 border cursor-pointer transition-all space-y-2",
                  cycleMode === "keyword" ? "bg-foreground/5 border-foreground shadow-sm" : "bg-background border-border opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex justify-between items-center text-xs font-bold uppercase">
                  <span>Paycheck Keyword</span>
                  {cycleMode === "keyword" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Resets whenever a deposit matches your employer name.
                </p>
              </div>

              <div 
                onClick={() => setCycleMode("monthly")}
                className={cn(
                  "p-4 border cursor-pointer transition-all space-y-2",
                  cycleMode === "monthly" ? "bg-foreground/5 border-foreground shadow-sm" : "bg-background border-border opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex justify-between items-center text-xs font-bold uppercase">
                  <span>Calendar Monthly</span>
                  {cycleMode === "monthly" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Standard 1st to end of month intervals.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteStep1} className="space-y-4 pt-2">
              {cycleMode === "keyword" && (
                <div className="space-y-2">
                  <Label htmlFor="paycheck" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Employer / Paycheck Keyword
                  </Label>
                  <Input
                    id="paycheck"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. SALARY, PAYROLL, DIRECT DEPOSIT, EMPLOYER..."
                    className="rounded-none font-mono text-xs uppercase h-10 bg-background"
                  />
                  <span className="text-[9px] text-muted-foreground block font-sans">
                    When importing bank statements, transactions containing this term trigger a new cycle.
                  </span>
                </div>
              )}

              <Button type="submit" disabled={isSavingStep1} className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-11">
                {isSavingStep1 ? "Saving Configuration..." : "Proceed to Habits"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-2xl bg-card border border-border p-6 md:p-8 space-y-6 shadow-xl"
          >
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4" /> Select Your Spending Habits
              </h3>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                LEGER_OS will pre-seed neural categorization rules so your bank statements are categorized automatically with 99% accuracy right out of the box.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
              {HABIT_PRESETS.map((habit) => {
                const isSelected = selectedHabits.includes(habit.id)
                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={cn(
                      "p-3 border transition-all cursor-pointer select-none flex items-start gap-3",
                      isSelected ? "bg-foreground/10 border-foreground text-foreground" : "bg-background border-border/60 text-muted-foreground hover:bg-secondary/30"
                    )}
                  >
                    <div className={cn("w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5", isSelected ? "border-foreground bg-foreground/20 text-foreground" : "border-muted")}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="font-bold uppercase text-[11px] tracking-wide text-foreground">{habit.name}</div>
                      <div className="text-[9px] opacity-70 font-sans mt-0.5 line-clamp-1">{habit.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setStep(1)} variant="outline" className="rounded-none uppercase font-mono text-xs tracking-widest h-11 px-6">
                Back
              </Button>
              <Button onClick={handleSeedAndProceed} disabled={isSeeding} className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-11">
                {isSeeding ? "Seeding Database Rules..." : `Initialize ${selectedHabits.length} Habit Rules`} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-xl bg-card border border-border p-8 text-center space-y-6 shadow-2xl"
          >
            <div className="w-16 h-16 bg-foreground/10 border border-foreground/40 text-foreground mx-auto flex items-center justify-center">
              <Terminal className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold uppercase tracking-widest text-foreground">Mainframe Initialized</h3>
              <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto leading-relaxed">
                Your custom paycheck architecture and merchant automation rules are now active. Proceed to the Ledger to import your first bank statement extract.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                onClick={async () => {
                  if (user) await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id)
                  router.push('/')
                  router.refresh()
                }} 
                variant="outline" 
                className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-12"
              >
                Return to Dashboard
              </Button>
              <Button 
                onClick={async () => {
                  if (user) await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id)
                  router.push('/expenses')
                  router.refresh()
                }} 
                className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-12 bg-foreground text-background hover:bg-foreground/90"
              >
                <Upload className="mr-2 h-4 w-4" /> Upload Statement
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Metadata Footer */}
      <div className="pt-8 border-t border-border w-full flex justify-between items-center opacity-40 font-mono text-[9px] uppercase tracking-widest">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <Cpu className="h-3 w-3" />
               <span>Kernel_Init: OK</span>
            </div>
            <div className="flex items-center gap-1.5">
               <Database className="h-3 w-3" />
               <span>RLS_Policy: Active</span>
            </div>
         </div>
         <span>LEGER_OS v4.0 // Multi-User Ready</span>
      </div>
    </div>
  )
}
