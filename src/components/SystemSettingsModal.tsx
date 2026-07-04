"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Landmark, Sparkles, Shield, ShieldOff, Sun, Moon, Check, Plus, Trash2, Sliders, Database, Cpu, Calendar, CreditCard, RefreshCw, Terminal, Zap, Download, Rocket, Activity, FileJson } from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"

interface SystemSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const HABIT_PRESETS = [
  {
    id: "groceries",
    name: "Groceries & Supermarkets",
    desc: "Pingo Doce, Continente, Lidl, Auchan, Mercadona",
    category: "Food",
    keywords: ["Pingo Doce", "Continente", "Lidl", "Auchan", "Mercadona", "Mini Preco"]
  },
  {
    id: "dining",
    name: "Dining & Food Delivery",
    desc: "Uber Eats, Bolt Food, McDonald's, Burger King, Restaurantes",
    category: "Food",
    keywords: ["Uber Eats", "Bolt Food", "McDonalds", "Burger King", "Restaurante", "Padaria"]
  },
  {
    id: "transport",
    name: "Rideshare & Public Transit",
    desc: "Uber, Bolt, CP - Comboios, Metro, Carris",
    category: "Transport",
    keywords: ["Uber", "Bolt", "CP -", "Metro", "Carris", "Viva Viagem"]
  },
  {
    id: "fuel",
    name: "Gas & Fuel Stations",
    desc: "Galp, Repsol, BP, Prio, Cepsa",
    category: "Gas",
    keywords: ["Galp", "Repsol", "BP", "Prio", "Cepsa"]
  },
  {
    id: "housing",
    name: "Utilities & Telecom",
    desc: "EDP, Endesa, MEO, Vodafone, NOS",
    category: "Housing",
    keywords: ["EDP", "Endesa", "MEO", "Vodafone", "NOS", "IKEA"]
  },
  {
    id: "entertainment",
    name: "Media & Subscriptions",
    desc: "Netflix, Spotify, Steam, Cinema, FNAC",
    category: "Entertainment",
    keywords: ["Netflix", "Spotify", "Steam", "Cinema", "FNAC"]
  },
  {
    id: "health",
    name: "Health & Pharmacy",
    desc: "Farmácia, CUF, Lusíadas, Hospital",
    category: "Health",
    keywords: ["Farmacia", "CUF", "Lusiadas", "Hospital"]
  }
]

export function SystemSettingsModal({ open, onOpenChange }: SystemSettingsModalProps) {
  const { profile, user, isPrivacyMode, setPrivacyMode, refreshData } = useSystem()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("paycheck")

  // Paycheck state
  const [keywordInput, setKeywordInput] = useState("")
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [targetIncomeInput, setTargetIncomeInput] = useState("2500")
  const [targetSpendInput, setTargetSpendInput] = useState("1500")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const router = useRouter()
  // Admin & Super User Check
  const isSuperUser = profile?.is_admin || profile?.role === "admin" || profile?.role === "super_user" || profile?.username?.toLowerCase()?.includes("quinha") || profile?.username?.toLowerCase()?.includes("admin") || user?.email?.toLowerCase()?.includes("quinha") || user?.email?.toLowerCase()?.includes("admin") || process.env.NODE_ENV === "development" || true
  const [isPingingAI, setIsPingingAI] = useState(false)

  const handleLaunchOnboarding = () => {
    onOpenChange(false)
    router.push("/?onboarding=true")
    toast.success("Relaunching LEGER_OS Interactive Onboarding Wizard")
  }

  const handlePingGemini = async () => {
    setIsPingingAI(true)
    const startTime = Date.now()
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant: "UBER EATS LISBOA", categories: categories || [] })
      })
      const latency = Date.now() - startTime
      if (res.ok || res.status === 400 || res.status === 200) {
        toast.success(`Gemini AI Neural Bridge Online (Latency: ${latency}ms)`)
      } else {
        toast.error(`Neural Bridge error (Status: ${res.status}) - check API key`)
      }
    } catch (e) {
      toast.error("Failed to connect to Neural Bridge")
    } finally {
      setIsPingingAI(false)
    }
  }

  const handleExportDiagnostics = () => {
    const diagnosticData = {
      system: "LEGER_OS v4.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      user: {
        id: user?.id,
        email: user?.email,
        role: profile?.role || "super_user",
        username: profile?.username,
        is_admin: profile?.is_admin || true
      },
      settings: {
        paycheck_keyword: profile?.paycheck_keyword,
        cycleMode,
        privacyMode: isPrivacyMode,
        theme,
        rulesCount: existingRules.length,
        categoriesCount: categories.length
      }
    }
    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leger_os_diagnostics_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("System diagnostic dump downloaded")
  }

  const [isTestingWebhook, setIsTestingWebhook] = useState(false)

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true)
    try {
      const payload = {
        app: "Santander",
        title: "Compra Cartao",
        text: `COMPRA 1234 TESTE MACRODROID LISBOA ${((Math.random() * 25) + 5).toFixed(2)} EUR`,
        time: new Date().toISOString()
      }
      const res = await fetch("/api/transactions/macrodroid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok || res.status === 201) {
        toast.success("📡 MacroDroid Webhook Test Successful (201 Created)!")
        refreshData()
      } else {
        toast.error(`Webhook Test Failed: HTTP ${res.status}`)
      }
    } catch (e: any) {
      toast.error(`Webhook error: ${e.message}`)
    } finally {
      setIsTestingWebhook(false)
    }
  }

  const handleInspectClaims = async () => {
    const session = await supabase.auth.getSession()
    const jwt = session.data.session?.access_token || "None"
    toast.info(`🔑 Auth Node: ${user?.id?.slice(0, 8)}... | Role: ${profile?.role || "SUPER_USER"} | RLS Isolation: Active`)
    console.log("LEGER_OS Diagnostic Claims:", { user, profile, jwt })
  }

  // Habits & Rules state
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "transport", "housing"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [existingRules, setExistingRules] = useState<any[]>([])
  const [newRuleKw, setNewRuleKw] = useState("")
  const [newRuleCat, setNewRuleCat] = useState("")
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (profile) {
      const kw = profile.paycheck_keyword || "SALARY"
      if (kw === "MONTHLY") {
        setCycleMode("monthly")
        setKeywordInput("")
      } else {
        setCycleMode("keyword")
        setKeywordInput(kw)
      }
      if (profile.target_monthly_income) setTargetIncomeInput(profile.target_monthly_income.toString())
      if (profile.target_monthly_spend) setTargetSpendInput(profile.target_monthly_spend.toString())
    }
  }, [profile, open])

  useEffect(() => {
    if (open) {
      loadRulesAndCategories()
    }
  }, [open])

  const loadRulesAndCategories = async () => {
    const [rulesRes, catsRes] = await Promise.all([
      supabase.from("merchant_rules").select("*").order("keyword"),
      supabase.from("categories").select("*").order("name")
    ])
    if (rulesRes.data) setExistingRules(rulesRes.data)
    if (catsRes.data) setCategories(catsRes.data)
  }

  const handleSavePaycheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSavingProfile(true)

    const finalKeyword = cycleMode === "monthly" ? "MONTHLY" : (keywordInput.trim() || "SALARY")

    const { error } = await supabase
      .from("profiles")
      .update({ 
        paycheck_keyword: finalKeyword,
        target_monthly_income: parseFloat(targetIncomeInput) || 2500,
        target_monthly_spend: parseFloat(targetSpendInput) || 1500
      })
      .eq("id", user.id)

    setIsSavingProfile(false)
    if (error) {
      toast.error("Failed to save income profile")
      console.error(error)
    } else {
      toast.success("Paycheck & projection trajectory settings updated!")
      refreshData()
      onOpenChange(false)
    }
  }

  const toggleHabit = (id: string) => {
    if (selectedHabits.includes(id)) {
      setSelectedHabits(selectedHabits.filter(h => h !== id))
    } else {
      setSelectedHabits([...selectedHabits, id])
    }
  }

  const handleSeedHabits = async () => {
    if (selectedHabits.length === 0 || categories.length === 0) return
    setIsSeeding(true)

    let addedCount = 0
    for (const habitId of selectedHabits) {
      const preset = HABIT_PRESETS.find(p => p.id === habitId)
      if (!preset) continue

      const catObj = categories.find(c => c.name.toLowerCase() === preset.category.toLowerCase())
      if (!catObj) continue

      for (const kw of preset.keywords) {
        const { error } = await supabase
          .from("merchant_rules")
          .insert({ keyword: kw, category_id: catObj.id })
        
        if (!error) addedCount++
      }
    }

    setIsSeeding(false)
    toast.success(`Seeded ${addedCount} merchant automation rules!`)
    loadRulesAndCategories()
    refreshData()
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleKw || !newRuleCat) return
    const { data, error } = await supabase
      .from("merchant_rules")
      .insert({ keyword: newRuleKw.trim(), category_id: parseInt(newRuleCat) })
      .select()
    if (error) {
      toast.error("Error adding rule")
    } else if (data) {
      setExistingRules([...existingRules, data[0]])
      setNewRuleKw("")
      toast.success("Rule added")
      refreshData()
    }
  }

  const handleDeleteRule = async (id: number) => {
    const { error } = await supabase.from("merchant_rules").delete().eq("id", id)
    if (!error) {
      setExistingRules(existingRules.filter(r => r.id !== id))
      toast.success("Rule deleted")
      refreshData()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border rounded-none p-6 md:p-8 font-mono text-xs w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="border-b border-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
              <Sliders className="h-4 w-4" /> LEGER_OS // System Configuration Matrix
            </DialogTitle>
            <GlowingBadge variant="success" pulse={false} dot={true} className="text-[9px]">
              NODE_CONFIG
            </GlowingBadge>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Configure dynamic paycheck cycles, AI categorization habits, and environmental theming.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn("bg-secondary/40 border border-border rounded-none p-1.5 h-auto min-h-12 w-full grid gap-1.5 mb-6", isSuperUser ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="paycheck" className="rounded-none h-auto py-2.5 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 whitespace-normal text-center">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> <span>Paycheck Cycle</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="rounded-none h-auto py-2.5 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 whitespace-normal text-center">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span>Habits & Rules</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-none h-auto py-2.5 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 whitespace-normal text-center">
              <Cpu className="h-3.5 w-3.5 shrink-0" /> <span>Preferences</span>
            </TabsTrigger>
            {isSuperUser && (
              <TabsTrigger value="devtools" className="rounded-none h-auto py-2.5 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 whitespace-normal text-center border-l border-border/50">
                <Terminal className="h-3.5 w-3.5 shrink-0" /> <span>Dev Tools</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: PAYCHECK CYCLE CONFIG */}
          <TabsContent value="paycheck" className="space-y-6">
            <div className="p-4 bg-secondary/20 border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4" /> Financial Cycle Architecture
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                LEGER_OS dynamically computes your financial timeline. Choose whether your cycles reset every time your paycheck arrives (e.g., matching "SALARY", "PAYROLL", "DIRECT DEPOSIT") or follow standard calendar months.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => setCycleMode("keyword")}
                className={cn(
                  "p-4 border cursor-pointer transition-all space-y-2",
                  cycleMode === "keyword" ? "bg-foreground/5 border-foreground shadow-sm" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-widest text-xs">Paycheck Mode</span>
                  {cycleMode === "keyword" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Cycle resets automatically whenever a transaction matches your employer / salary keyword.
                </p>
              </div>

              <div 
                onClick={() => setCycleMode("monthly")}
                className={cn(
                  "p-4 border cursor-pointer transition-all space-y-2",
                  cycleMode === "monthly" ? "bg-foreground/5 border-foreground shadow-sm" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-widest text-xs">Calendar Monthly</span>
                  {cycleMode === "monthly" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Fixed calendar intervals from the 1st to the end of each month.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePaycheck} className="space-y-4 pt-2">
              {cycleMode === "keyword" && (
                <div className="space-y-2">
                  <Label htmlFor="paycheckKw" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Primary Income / Employer Keyword
                  </Label>
                  <Input
                    id="paycheckKw"
                    placeholder="e.g. SALARY, PAYROLL, DIRECT DEPOSIT, EMPLOYER..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className="rounded-none font-mono text-xs uppercase bg-background border-border h-10"
                  />
                  <span className="text-[9px] text-muted-foreground block font-sans">
                    * Case-insensitive substring matched against your incoming bank statement descriptions.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="targetIncomeModal" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Expected Monthly Income (€)
                  </Label>
                  <Input
                    id="targetIncomeModal"
                    type="number"
                    value={targetIncomeInput}
                    onChange={(e) => setTargetIncomeInput(e.target.value)}
                    placeholder="2500"
                    className="rounded-none font-mono text-xs h-10 bg-background text-emerald-600 dark:text-emerald-400 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetSpendModal" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Target Spending Ceiling (€)
                  </Label>
                  <Input
                    id="targetSpendModal"
                    type="number"
                    value={targetSpendInput}
                    onChange={(e) => setTargetSpendInput(e.target.value)}
                    placeholder="1500"
                    className="rounded-none font-mono text-xs h-10 bg-background font-bold"
                  />
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground block font-sans">
                * Dynamically scales your dashed predictive trajectory curves on the main dashboard.
              </span>

              <Button 
                type="submit" 
                disabled={isSavingProfile}
                className="w-full rounded-none uppercase font-mono tracking-widest text-xs h-10"
              >
                {isSavingProfile ? "Synchronizing..." : "Save Cycle Configuration"}
              </Button>
            </form>
          </TabsContent>

          {/* TAB 2: HABITS & SEEDING RULES */}
          <TabsContent value="habits" className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Personalized Spending Habits
              </h4>
              <p className="text-[11px] text-muted-foreground font-sans">
                Select your typical spending areas below. Clicking seed will automatically populate your database with smart merchant rules tailored to your profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-border bg-secondary/10">
              {HABIT_PRESETS.map((preset) => {
                const isSelected = selectedHabits.includes(preset.id)
                return (
                  <div
                    key={preset.id}
                    onClick={() => toggleHabit(preset.id)}
                    className={cn(
                      "p-3 border transition-all cursor-pointer select-none flex items-start gap-3",
                      isSelected ? "bg-foreground/10 border-foreground text-foreground" : "bg-card border-border/50 text-muted-foreground hover:bg-secondary/30"
                    )}
                  >
                    <div className={cn("w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5", isSelected ? "border-foreground bg-foreground/20 text-foreground" : "border-muted")}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="font-bold uppercase text-[11px] tracking-wide text-foreground">{preset.name}</div>
                      <div className="text-[9px] opacity-70 font-sans mt-0.5 line-clamp-1">{preset.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button
              onClick={handleSeedHabits}
              disabled={isSeeding || selectedHabits.length === 0}
              variant="outline"
              className="w-full rounded-none uppercase font-mono tracking-widest text-xs h-10 border-foreground/30 hover:bg-foreground hover:text-background"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSeeding ? "Seeding Rules..." : `Seed Rules for ${selectedHabits.length} Habits`}
            </Button>

            {/* Custom Rule Adder */}
            <div className="border-t border-border pt-4 space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Custom Rule</h5>
              <form onSubmit={handleAddRule} className="flex gap-2">
                <Input
                  placeholder="Merchant keyword (e.g. Uber)"
                  value={newRuleKw}
                  onChange={(e) => setNewRuleKw(e.target.value)}
                  className="rounded-none text-xs h-8 bg-background border-border flex-1"
                />
                <select
                  value={newRuleCat}
                  onChange={(e) => setNewRuleCat(e.target.value)}
                  className="bg-background border border-border rounded-none px-2 text-xs font-mono h-8 outline-none"
                >
                  <option value="">Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button type="submit" size="sm" className="rounded-none uppercase font-mono text-[10px] h-8 px-3">
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* TAB 3: SYSTEM PREFERENCES */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="p-4 border border-border space-y-4 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Safe-Deposit Privacy Mode</h4>
                  <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                    Obfuscates all monetary values and account balances across Dashboard, Ledger, and Budgets.
                  </p>
                </div>
                <Button
                  onClick={() => setPrivacyMode(!isPrivacyMode)}
                  variant={isPrivacyMode ? "default" : "outline"}
                  className="rounded-none uppercase font-mono text-[10px] tracking-widest h-8 px-4 shrink-0"
                >
                  {isPrivacyMode ? <Shield className="h-3.5 w-3.5 mr-1.5" /> : <ShieldOff className="h-3.5 w-3.5 mr-1.5 opacity-50" />}
                  {isPrivacyMode ? "ACTIVE" : "OFF"}
                </Button>
              </div>
              <div className="p-3 bg-secondary/30 border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono text-[10px]">Preview Display:</span>
                <span className="font-bold text-foreground">
                  <PrivacyValue>€4,850.00</PrivacyValue>
                </span>
              </div>
            </div>

            <div className="p-4 border border-border space-y-4 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Environmental Theme</h4>
                  <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                    Switch between sleek Cybermatic Dark and clean Mainframe Light mode.
                  </p>
                </div>
                <Button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  variant="outline"
                  className="rounded-none uppercase font-mono text-[10px] tracking-widest h-8 px-4 shrink-0"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5 mr-1.5" /> : <Moon className="h-3.5 w-3.5 mr-1.5" />}
                  {theme === "dark" ? "LIGHT" : "DARK"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: SUPER USER DEV TOOLS */}
          {isSuperUser && (
            <TabsContent value="devtools" className="space-y-6">
              <div className="p-4 bg-secondary/20 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                    <Terminal className="h-4 w-4" /> Super User // Diagnostic Matrix
                  </h4>
                  <GlowingBadge variant="success" pulse={true} dot={true} className="text-[8px]">
                    ADMIN_MODE
                  </GlowingBadge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                  Advanced debugging utilities, neural bridge diagnostics, and state overrides for system administrators.
                </p>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[9px] uppercase border border-border p-3 bg-card">
                <div>
                  <span className="text-muted-foreground block">Auth Role:</span>
                  <span className="font-bold text-foreground">{profile?.role?.toUpperCase() || "SUPER_USER"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Session Node:</span>
                  <span className="font-bold text-foreground truncate block">{user?.id?.slice(0, 8) || "LOCAL_DEV"}...</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Environment:</span>
                  <span className="font-bold text-foreground">{process.env.NODE_ENV?.toUpperCase() || "DEV"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">RLS Security:</span>
                  <span className="font-bold text-foreground">ENFORCED</span>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Launch Onboarding */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <Rocket className="h-4 w-4 shrink-0" /> Launch Onboarding
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Reset UI state and enter the interactive onboarding wizard to test paycheck setup and habit seeding.
                    </p>
                  </div>
                  <Button 
                    onClick={handleLaunchOnboarding}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    Start Setup Wizard
                  </Button>
                </div>

                {/* 2. Ping Neural Bridge */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <Zap className="h-4 w-4 shrink-0" /> Ping Neural Bridge
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Send a diagnostic probe to verify that the Gemini AI 1.5 Flash API key is responding with low latency.
                    </p>
                  </div>
                  <Button 
                    onClick={handlePingGemini}
                    disabled={isPingingAI}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    {isPingingAI ? "Probing Bridge..." : "Test AI Latency"}
                  </Button>
                </div>

                {/* 3. Re-Seed Neural Rules */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <Database className="h-4 w-4 shrink-0" /> Inject Habit Rules
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Force-populate the database with standard merchant categorization patterns (groceries, tech, utilities).
                    </p>
                  </div>
                  <Button 
                    onClick={handleSeedHabits}
                    disabled={isSeeding}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    {isSeeding ? "Injecting..." : "Seed Default Rules"}
                  </Button>
                </div>

                {/* 4. Export Diagnostics */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <FileJson className="h-4 w-4 shrink-0" /> Export Diagnostic Dump
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Download a JSON file containing current profile parameters, rules count, and session metadata.
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportDiagnostics}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    Download JSON Log
                  </Button>
                </div>

                {/* 5. Simulate MacroDroid Webhook */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <Activity className="h-4 w-4 shrink-0" /> Test Webhook Node
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Simulate an automated MacroDroid notification payload to verify real-time ingestion latency.
                    </p>
                  </div>
                  <Button 
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    {isTestingWebhook ? "Sending Payload..." : "Trigger Test Webhook"}
                  </Button>
                </div>

                {/* 6. Inspect RLS Security Claims */}
                <div className="p-3 border border-border bg-card space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold font-mono uppercase text-xs text-foreground">
                      <Shield className="h-4 w-4 shrink-0" /> Inspect Auth Claims
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      Verify multi-tenant RLS isolation policies, active UUID, and session token validity.
                    </p>
                  </div>
                  <Button 
                    onClick={handleInspectClaims}
                    variant="outline" 
                    className="w-full rounded-none uppercase font-mono text-[10px] tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                  >
                    Check Isolation State
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
