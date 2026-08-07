"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { getAIHeaders } from "@/lib/ai-client"
import { 
  Sparkles, Check, X, Sliders, Brain, Smartphone, Shield, ShieldOff, Sun, Moon, 
  LogOut, ShieldAlert, Copy, ChevronDown, Plus, Trash2, Search, Terminal, Zap, 
  Database, FileJson, Rocket, Landmark, Lock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from "@/lib/format"

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

interface SystemSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SystemSettingsModal({ open, onOpenChange }: SystemSettingsModalProps) {
  const { 
    currencySymbol, 
    isPro, 
    upgradeToPro, 
    cancelPro, 
    isSubscriptionOnly, 
    setSubscriptionOnly,
    profile,
    user,
    isPrivacyMode,
    setPrivacyMode,
    refreshProfile,
    refreshData,
    signOut
  } = useSystem()

  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("preferences")

  // Form states
  const [keywordInput, setKeywordInput] = useState("")
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [targetIncomeInput, setTargetIncomeInput] = useState("2500")
  const [targetSpendInput, setTargetSpendInput] = useState("1500")
  const [currencyInput, setCurrencyInput] = useState("EUR")
  const [languageInput, setLanguageInput] = useState("en-US")
  const [aiProviderInput, setAiProviderInput] = useState("gemini")
  const [customKeyInput, setCustomKeyInput] = useState("")
  const [aiYapLevelInput, setAiYapLevelInput] = useState<"concise" | "standard" | "verbose">("standard")
  const [decayInput, setDecayInput] = useState("0.12")
  const [isSaving, setIsSaving] = useState(false)

  // Rules & Habits state
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "dining", "transport"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [existingRules, setExistingRules] = useState<any[]>([])
  const [newRuleKw, setNewRuleKw] = useState("")
  const [newRuleCat, setNewRuleCat] = useState("")
  const [ruleSearchQuery, setRuleSearchQuery] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [isPingingAI, setIsPingingAI] = useState(false)

  const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_user" || profile?.username?.toLowerCase()?.includes("quinha") || profile?.username?.toLowerCase()?.includes("admin") || user?.email?.toLowerCase()?.includes("quinha") || user?.email?.toLowerCase()?.includes("admin") || process.env.NODE_ENV === "development"

  useEffect(() => {
    if (open) {
      loadRulesAndCategories()
    }
  }, [open])

  useEffect(() => {
    if (isSubscriptionOnly) {
      setActiveTab("pro")
    } else {
      setActiveTab("preferences")
    }
  }, [isSubscriptionOnly, open])

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
      if (profile.currency) setCurrencyInput(profile.currency)
      if (profile.language) setLanguageInput(profile.language)
      if (profile.ai_provider) setAiProviderInput(profile.ai_provider)
      if (profile.custom_api_key) setCustomKeyInput(profile.custom_api_key)
      if (profile.ai_yap_level) setAiYapLevelInput(profile.ai_yap_level)
      if (profile.decay_weight !== undefined) setDecayInput(profile.decay_weight.toString())
    }
  }, [profile])

  const loadRulesAndCategories = async () => {
    const [rulesRes, catsRes] = await Promise.all([
      supabase.from("merchant_rules").select("*").order("keyword"),
      supabase.from("categories").select("*").order("name")
    ])
    if (rulesRes.data) setExistingRules(rulesRes.data)
    if (catsRes.data) setCategories(catsRes.data)
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setSubscriptionOnly(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSaving(true)

    const finalKeyword = cycleMode === "monthly" ? "MONTHLY" : (keywordInput.trim() || "SALARY")

    const { error } = await supabase
      .from("profiles")
      .update({
        paycheck_keyword: finalKeyword,
        target_monthly_income: parseFloat(targetIncomeInput) || 2500,
        target_monthly_spend: parseFloat(targetSpendInput) || 1500,
        currency: currencyInput,
        language: languageInput,
        ai_provider: aiProviderInput,
        custom_api_key: customKeyInput,
        decay_weight: parseFloat(decayInput) || 0.12,
        ai_yap_level: isPro ? aiYapLevelInput : profile?.ai_yap_level || 'standard'
      })
      .eq("id", user.id)

    setIsSaving(false)
    if (error) {
      toast.error("Failed to save settings")
      console.error(error)
    } else {
      toast.success("System configuration updated!")
      await refreshProfile()
      refreshData()
      handleOpenChange(false)
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
    toast.success(`Successfully registered ${addedCount} habit rules!`)
    loadRulesAndCategories()
    refreshData()
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleKw || !newRuleCat) return

    const trimmedKw = newRuleKw.trim()
    const catId = parseInt(newRuleCat)
    const tempId = Date.now()

    const tempRule = { id: tempId, keyword: trimmedKw, category_id: catId }
    const previousRules = [...existingRules]

    setExistingRules(prev => [...prev, tempRule])
    setNewRuleKw("")
    setNewRuleCat("")
    toast.success(`Rule registered: "${trimmedKw}"`)

    const { data, error } = await supabase
      .from("merchant_rules")
      .insert({ keyword: trimmedKw, category_id: catId })
      .select()

    if (error) {
      setExistingRules(previousRules)
      toast.error("Failed to add custom rule")
      return
    }

    if (data && data[0]) {
      setExistingRules(prev => prev.map(r => r.id === tempId ? data[0] : r))
    } else {
      loadRulesAndCategories()
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm("Delete this categorization rule?")) return

    const previousRules = [...existingRules]
    setExistingRules(existingRules.filter(r => r.id !== id))
    toast.success("Rule removed")

    const { error } = await supabase.from("merchant_rules").delete().eq("id", id)
    if (error) {
      setExistingRules(previousRules)
      toast.error("Failed to delete rule")
    }
  }

  const handlePingGemini = async () => {
    setIsPingingAI(true)
    const startTime = Date.now()
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: getAIHeaders(aiProviderInput, customKeyInput),
        body: JSON.stringify({ expenses: [{ merchant: "UBER EATS LISBOA" }], categories: categories || [] })
      })
      const latency = Date.now() - startTime
      if (res.ok || res.status === 400 || res.status === 200) {
        toast.success(`AI Bridge Online (Latency: ${latency}ms)`)
      } else {
        toast.error(`Bridge error (Status: ${res.status}) - check API key`)
      }
    } catch (e) {
      toast.error("Failed to ping AI Bridge")
    } finally {
      setIsPingingAI(false)
    }
  }

  const handleExportDiagnostics = () => {
    const diagnosticData = {
      system: "LEGER_OS v4.0",
      timestamp: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        username: profile?.username,
        role: profile?.role || "super_user"
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
    a.download = `leger_os_diagnostics_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast.success("Diagnostics exported")
  }

  const filteredRules = existingRules.filter(r => {
    if (!ruleSearchQuery.trim()) return true
    const q = ruleSearchQuery.toLowerCase()
    const cat = categories.find(c => c.id === r.category_id)
    return r.keyword.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q)
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border border-border rounded-none p-4 sm:p-6 font-mono text-xs w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl shadow-2xl overflow-hidden h-[650px] max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border pb-4 pr-8 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2 truncate text-foreground">
              <Sliders className="h-4 w-4 text-foreground" />
              <span>System Settings & Configuration</span>
            </DialogTitle>
            <GlowingBadge variant={isPro ? "success" : "neutral"} pulse={isPro} dot={true} className="text-[9px] shrink-0">
              {isPro ? "PRO_ACTIVE" : "CORE_FREE"}
            </GlowingBadge>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Calibrate financial cycles, AI providers, merchant rules, phone sync, and subscription tier.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Tabs & Body */}
        <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
            <TabsList className={cn(
              "bg-secondary/40 border border-border rounded-none p-1 !h-auto w-full grid gap-1 shrink-0",
              isSuperUser ? "grid-cols-3 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-6"
            )}>
              <TabsTrigger value="preferences" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                <Sliders className="h-3.5 w-3.5" /> <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                <Brain className="h-3.5 w-3.5" /> <span>AI Engine</span>
              </TabsTrigger>
              <TabsTrigger value="habits" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> <span>Rules</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> <span>Phone</span>
              </TabsTrigger>
              <TabsTrigger value="pro" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Sparkles className="h-3.5 w-3.5" /> <span>PRO</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1">
                <Shield className="h-3.5 w-3.5" /> <span>Account</span>
              </TabsTrigger>
              {isSuperUser && (
                <TabsTrigger value="devtools" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1 col-span-3 sm:col-span-1">
                  <Terminal className="h-3.5 w-3.5" /> <span>Dev</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* TAB 1: GENERAL PREFERENCES */}
            <TabsContent value="preferences" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-[10px] font-mono flex items-center gap-1.5">
                      {isPrivacyMode ? <Shield className="h-3.5 w-3.5 text-emerald-500" /> : <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      Privacy Mode
                    </span>
                    <span className={cn("text-[8px] font-mono uppercase px-1.5 py-0.5 font-bold", isPrivacyMode ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-secondary text-muted-foreground")}>
                      {isPrivacyMode ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                    Obfuscates currency values across all dashboard views.
                  </p>
                  <Button 
                    type="button"
                    variant={isPrivacyMode ? "default" : "outline"} 
                    onClick={() => setPrivacyMode(!isPrivacyMode)}
                    className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold cursor-pointer"
                  >
                    {isPrivacyMode ? "Disable Safe-Deposit" : "Enable Safe-Deposit"}
                  </Button>
                </div>

                <div className="p-3 bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-[10px] font-mono flex items-center gap-1.5">
                      {theme === "dark" ? <Moon className="h-3.5 w-3.5 text-primary" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                      Theme Mode
                    </span>
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 font-bold bg-secondary text-foreground">
                      {theme === "dark" ? "CYBER DARK" : "LIGHT"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                    Toggle terminal theme presentation.
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold cursor-pointer"
                  >
                    Switch to {theme === "dark" ? "Mainframe Light" : "Cybermatic Dark"}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
                    Cycle Reset Cadence
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div 
                      onClick={() => setCycleMode("keyword")}
                      className={cn(
                        "p-3 border cursor-pointer transition-all space-y-1 rounded-none",
                        cycleMode === "keyword" ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[10px] font-mono">Paycheck Keyword Mode</span>
                        {cycleMode === "keyword" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                        Resets automatically whenever your paycheck description matches.
                      </p>
                    </div>

                    <div 
                      onClick={() => setCycleMode("monthly")}
                      className={cn(
                        "p-3 border cursor-pointer transition-all space-y-1 rounded-none",
                        cycleMode === "monthly" ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[10px] font-mono">Calendar Monthly Mode</span>
                        {cycleMode === "monthly" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                        Resets on the 1st of every calendar month.
                      </p>
                    </div>
                  </div>
                </div>

                {cycleMode === "keyword" && (
                  <div className="space-y-1 bg-secondary/15 p-3 border border-border">
                    <Label htmlFor="modalPaycheckKw" className="text-[9px] uppercase font-mono font-bold text-foreground">
                      Employer / Paycheck Keyword
                    </Label>
                    <Input
                      id="modalPaycheckKw"
                      placeholder="e.g. SALARY, PAYROLL, DIRECT DEPOSIT..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="rounded-none text-xs uppercase bg-background border-border h-9 font-bold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="modalCurrency" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                      Base Currency
                    </Label>
                    <div className="relative">
                      <select
                        id="modalCurrency"
                        value={currencyInput}
                        onChange={(e) => setCurrencyInput(e.target.value)}
                        className="w-full rounded-none font-mono text-xs h-9 bg-background border border-border px-3 pr-8 font-bold text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]: [string, { symbol: string; name: string }]) => (
                          <option key={code} value={code}>{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="modalLanguage" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                      System Locale / Language
                    </Label>
                    <div className="relative">
                      <select
                        id="modalLanguage"
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="w-full rounded-none font-mono text-xs h-9 bg-background border border-border px-3 pr-8 font-bold text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]: [string, { name: string }]) => (
                          <option key={code} value={code}>{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="modalIncome" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                      Expected Monthly Income ({currencySymbol})
                    </Label>
                    <Input
                      id="modalIncome"
                      type="number"
                      value={targetIncomeInput}
                      onChange={(e) => setTargetIncomeInput(e.target.value)}
                      placeholder="2500"
                      className="rounded-none text-xs h-9 bg-background text-emerald-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="modalSpend" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                      Target Spending Ceiling ({currencySymbol})
                    </Label>
                    <Input
                      id="modalSpend"
                      type="number"
                      value={targetSpendInput}
                      onChange={(e) => setTargetSpendInput(e.target.value)}
                      placeholder="1500"
                      className="rounded-none text-xs h-9 bg-background font-bold"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-9 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[10px] font-bold tracking-widest cursor-pointer"
                >
                  {isSaving ? "SAVING..." : "SAVE GENERAL CONFIGURATION"}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 2: AI ENGINE CONFIG */}
            <TabsContent value="ai" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="p-4 bg-secondary/10 border border-border space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider font-mono text-foreground font-bold block">
                      Neural Provider & Key Setup
                    </span>
                    <span className="text-[10px] text-muted-foreground font-sans block">
                      Select your preferred provider or supply a custom API key.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="modalAiProvider" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                        Provider Model
                      </Label>
                      <div className="relative">
                        <select
                          id="modalAiProvider"
                          value={aiProviderInput}
                          onChange={(e) => setAiProviderInput(e.target.value)}
                          className="w-full bg-background border border-border rounded-none h-9 px-3 pr-8 text-xs font-mono text-foreground outline-none focus:border-foreground appearance-none"
                        >
                          <option value="gemini">Google Gemini (Default)</option>
                          <option value="openai">OpenAI (GPT-4o-mini)</option>
                          <option value="groq">Groq (Llama 3.3 Fast)</option>
                          <option value="ollama">Ollama (Local / Self-hosted)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modalCustomKey" className="text-[9px] uppercase font-mono font-bold text-muted-foreground flex justify-between">
                        <span>Custom API Key / Endpoint</span>
                        {customKeyInput && <span className="text-emerald-500 font-bold lowercase">[active]</span>}
                      </Label>
                      <Input
                        id="modalCustomKey"
                        type="password"
                        value={customKeyInput}
                        onChange={(e) => setCustomKeyInput(e.target.value)}
                        placeholder={aiProviderInput === "ollama" ? "http://localhost:11434" : "e.g. AIzaSy..."}
                        className="rounded-none font-mono text-xs h-9 bg-background"
                      />
                    </div>
                  </div>

                  {/* Yap Level (PRO Gated) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="modalYapLevel" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                        AI Verbosity / Yap Level
                      </Label>
                      {!isPro && (
                        <span className="text-[8px] font-mono uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5">
                          PRO LOCKED
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        id="modalYapLevel"
                        value={isPro ? aiYapLevelInput : "standard"}
                        disabled={!isPro}
                        onChange={(e) => setAiYapLevelInput(e.target.value as any)}
                        className={cn(
                          "w-full bg-background border border-border rounded-none h-9 px-3 pr-8 text-xs font-mono outline-none appearance-none",
                          !isPro ? "opacity-60 cursor-not-allowed text-muted-foreground" : "text-foreground focus:border-foreground"
                        )}
                      >
                        <option value="concise">Concise & Direct (Brief answers)</option>
                        <option value="standard">Standard (Balanced context)</option>
                        <option value="verbose">Verbose & Explanatory (Thorough strategies)</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Recency Decay Weight (PRO Gated Calibration) */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                        Recency Decay (λ):
                        {!isPro && (
                          <span className="text-[8px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2">
                            PRO FEATURE
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-foreground">{decayInput} (~{Math.round(0.693 / (parseFloat(decayInput) || 0.12))} day half-life)</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.01"
                      value={decayInput}
                      disabled={!isPro}
                      onChange={(e) => setDecayInput(e.target.value)}
                      className={cn(
                        "w-full accent-emerald-500 h-1.5 bg-secondary",
                        !isPro ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-9 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[10px] font-bold tracking-widest cursor-pointer"
                >
                  {isSaving ? "SAVING..." : "SAVE AI & ENGINE CONFIGURATION"}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 3: HABITS & MERCHANT RULES */}
            <TabsContent value="habits" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="p-4 bg-card border border-border space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">
                    1. Pre-built Spending Habit Clusters
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {HABIT_PRESETS.map((preset) => {
                      const isSelected = selectedHabits.includes(preset.id)
                      return (
                        <div
                          key={preset.id}
                          onClick={() => toggleHabit(preset.id)}
                          className={cn(
                            "p-2.5 border cursor-pointer transition-all flex flex-col justify-between space-y-1.5 rounded-none",
                            isSelected ? "bg-foreground/5 border-foreground ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-75"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold uppercase tracking-wider text-[10px] font-mono text-foreground">{preset.name}</span>
                            <div className={cn("w-3.5 h-3.5 flex items-center justify-center border shrink-0", isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background")}>
                              {isSelected && <Check className="h-2.5 w-2.5" />}
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-sans leading-tight">
                            {preset.desc}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-secondary/20 border border-border">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Selected: <strong className="text-foreground">{selectedHabits.length}</strong> Habit Clusters
                    </span>
                    <Button
                      onClick={handleSeedHabits}
                      disabled={isSeeding || selectedHabits.length === 0}
                      className="w-full sm:w-auto h-8 px-4 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[9px] font-bold tracking-widest cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {isSeeding ? "SEEDING..." : `SEED ${selectedHabits.length} CLUSTERS`}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">
                    2. Register Custom Merchant Rule
                  </span>
                  <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Merchant Keyword (e.g. UBER, APPLE)"
                      value={newRuleKw}
                      onChange={(e) => setNewRuleKw(e.target.value)}
                      className="rounded-none text-xs h-9 bg-background uppercase font-mono w-full sm:flex-1"
                    />
                    <div className="relative w-full sm:w-48">
                      <select
                        value={newRuleCat}
                        onChange={(e) => setNewRuleCat(e.target.value)}
                        className="bg-background border border-border rounded-none px-3 pr-8 text-xs font-mono h-9 outline-none w-full font-bold appearance-none"
                      >
                        <option value="">SELECT CATEGORY...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    <Button type="submit" className="rounded-none uppercase font-mono text-[9px] font-bold h-9 px-4 w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
                    </Button>
                  </form>

                  {existingRules.length > 0 && (
                    <div className="pt-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">
                          Active Rules ({filteredRules.length} of {existingRules.length})
                        </span>
                        <div className="relative w-40">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Filter..."
                            value={ruleSearchQuery}
                            onChange={(e) => setRuleSearchQuery(e.target.value)}
                            className="pl-7 h-7 text-[9px] rounded-none bg-background border-border"
                          />
                        </div>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto border border-border divide-y divide-border bg-card">
                        {filteredRules.map((rule) => {
                          const cat = categories.find(c => c.id === rule.category_id)
                          return (
                            <div key={rule.id} className="p-2 flex items-center justify-between text-xs hover:bg-secondary/20 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground uppercase">{rule.keyword}</span>
                                <span className="text-[8px] text-muted-foreground px-1.5 py-0.5 bg-secondary border border-border">
                                  {cat?.name || "Unclassified"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: PHONE SYNC */}
            <TabsContent value="phone" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="p-4 bg-card border border-border space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-mono text-foreground font-bold flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> MacroDroid Android Push Sync
                    </span>
                    {!isPro ? (
                      <span className="text-[8px] font-mono uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5">
                        PRO TIER REQUIRED
                      </span>
                    ) : (
                      <GlowingBadge variant="success" pulse dot className="text-[8px]">ACTIVE</GlowingBadge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                    Automatically post bank notifications to LEGER_OS in real-time.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-mono uppercase font-bold text-muted-foreground">Unique Posting Endpoint</span>
                  {!isPro ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="font-mono text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>ENDPOINT LOCKED ON CORE FREE TIER</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                        Automated real-time push notification posting requires a LEGER_OS PRO node. Upgrade to PRO to activate your unique phone webhook URL.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("pro")}
                        className="w-full rounded-none h-8 bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-[9px] uppercase font-bold tracking-widest cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Upgrade to PRO (€4.99/mo)
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-secondary/40 border border-border p-2.5 font-mono text-[9px] break-all select-all flex items-center justify-between gap-2 text-foreground">
                      <span className="truncate">
                        {typeof window !== 'undefined' 
                          ? `${window.location.origin}/api/transactions/macrodroid?userId=${user?.id || ""}`
                          : `https://leger-os.vercel.app/api/transactions/macrodroid?userId=${user?.id || ""}`
                        }
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = typeof window !== 'undefined' 
                            ? `${window.location.origin}/api/transactions/macrodroid?userId=${user?.id || ""}`
                            : `https://leger-os.vercel.app/api/transactions/macrodroid?userId=${user?.id || ""}`
                          navigator.clipboard.writeText(url)
                          toast.success("MacroDroid URL copied!")
                        }}
                        className="hover:text-emerald-500 shrink-0 p-1 cursor-pointer"
                        title="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40 text-[10px] font-sans text-muted-foreground leading-normal">
                  <p className="font-mono text-[9px] font-bold text-foreground uppercase">Setup Steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create MacroDroid rule triggered on Bank Notification.</li>
                    <li>Add HTTP POST action to your copied endpoint above.</li>
                    <li>Set Content Type to <code className="font-mono bg-secondary px-1 text-foreground">application/json</code>.</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: PRO PLAN */}
            <TabsContent value="pro" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-500 font-mono">
                    <Sparkles className="h-3.5 w-3.5" /> LEGER_OS PRO TIER
                  </h4>
                  <span className={cn("px-2 py-0.5 text-[8px] font-mono uppercase font-bold border", isPro ? "bg-emerald-500 text-black border-emerald-500" : "bg-background text-muted-foreground border-border")}>
                    {isPro ? "PRO ACTIVE" : "CORE FREE"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  LEGER_OS includes a free Core Base for manual cash flow tracking. Upgrade to PRO to unlock automated MacroDroid sync, neural categorization, and recency-decay predictive analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CORE PLAN CARD */}
                <div className="p-4 bg-card border border-border space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-xs uppercase text-foreground">LEGER_OS CORE</h5>
                        <p className="text-[9px] text-muted-foreground font-mono">Free Forever Base</p>
                      </div>
                      <span className="text-base font-bold font-mono text-foreground">{currencySymbol}0<span className="text-[10px] text-muted-foreground">/mo</span></span>
                    </div>
                    <ul className="space-y-1.5 text-[10px] font-mono text-muted-foreground border-t border-border pt-2">
                      <li className="flex items-center gap-1.5 text-foreground"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Expense & Income Tracking</li>
                      <li className="flex items-center gap-1.5 text-foreground"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Paycheck Cycle & Budgets</li>
                      <li className="flex items-center gap-1.5 opacity-50"><X className="h-3 w-3 text-destructive shrink-0" /> Android Push Notification Sync</li>
                      <li className="flex items-center gap-1.5 opacity-50"><X className="h-3 w-3 text-destructive shrink-0" /> Recency Decay Predictive Simulations</li>
                    </ul>
                  </div>
                  <Button 
                    type="button"
                    disabled={!isPro} 
                    variant="outline" 
                    onClick={cancelPro}
                    className="w-full rounded-none font-mono text-[9px] uppercase h-8 border-destructive text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    {!isPro ? "Current Active Plan" : "Cancel PRO"}
                  </Button>
                </div>

                {/* PRO PLAN CARD */}
                <div className="p-4 bg-card border-2 border-emerald-500/50 space-y-3 flex flex-col justify-between relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.08)]">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-black font-mono font-bold text-[8px] px-2 py-0.5 uppercase">
                    RECOMMENDED
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-xs uppercase text-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-500" /> LEGER_OS PRO</h5>
                        <p className="text-[9px] text-emerald-500 font-mono">Autonomous Mainframe</p>
                      </div>
                      <span className="text-base font-bold font-mono text-foreground">{currencySymbol}4.99<span className="text-[10px] text-muted-foreground">/mo</span></span>
                    </div>
                    <ul className="space-y-1.5 text-[10px] font-mono text-muted-foreground border-t border-border pt-2">
                      <li className="flex items-center gap-1.5 text-foreground font-bold"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Android Push Sync</li>
                      <li className="flex items-center gap-1.5 text-foreground font-bold"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Gemini 2.5 Pro Neural Categorization</li>
                      <li className="flex items-center gap-1.5 text-foreground font-bold"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Recency Decay Predictive Simulations</li>
                      <li className="flex items-center gap-1.5 text-foreground"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Unlimited Statement Ingestions</li>
                    </ul>
                  </div>
                  <Button 
                    type="button"
                    onClick={upgradeToPro}
                    disabled={isPro}
                    className="w-full rounded-none font-mono text-[9px] uppercase font-bold h-8 bg-emerald-500 text-black hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    {isPro ? "PRO Access Active" : "Upgrade to PRO (€4.99/mo)"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: ACCOUNT & SECURITY */}
            <TabsContent value="account" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-foreground block">Session Node</span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate block">{user?.email || "USER"}</span>
                  </div>
                  <GlowingBadge variant="success" pulse dot className="text-[8px] uppercase">SECURE</GlowingBadge>
                </div>
                <Button
                  type="button"
                  onClick={() => signOut()}
                  variant="outline"
                  className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-background border-destructive/30 cursor-pointer"
                >
                  <LogOut className="h-3 w-3 mr-1.5" /> Disconnect Session & Sign Out
                </Button>
              </div>

              <div className="p-4 bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center gap-1.5 text-destructive font-mono font-bold text-xs uppercase">
                  <ShieldAlert className="h-3.5 w-3.5" /> Right to Erasure (GDPR / FTC)
                </div>
                <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                  Permanently purge your account, transactions, budgets, and saved preferences from the mainframe.
                </p>
                <Button
                  type="button"
                  onClick={async () => {
                    const confirmText = window.prompt("Type 'DELETE MY DATA' to permanently purge your account:")
                    if (confirmText !== "DELETE MY DATA") {
                      toast.error("Purge cancelled.")
                      return
                    }
                    const toastId = toast.loading("Purging profile...")
                    try {
                      const res = await fetch("/api/user/erase", { method: "POST" })
                      const data = await res.json()
                      if (data.success) {
                        toast.dismiss(toastId)
                        toast.success("Account purged.")
                        await signOut()
                      } else {
                        toast.dismiss(toastId)
                        toast.error(data.error || "Purge failed.")
                      }
                    } catch (e) {
                      toast.dismiss(toastId)
                      toast.error("Connection error.")
                    }
                  }}
                  variant="outline"
                  className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-background border-destructive/30 cursor-pointer"
                >
                  Purge All Data & Delete Account
                </Button>
              </div>
            </TabsContent>

            {/* TAB 7: DEV TOOLS (SUPER USERS ONLY) */}
            {isSuperUser && (
              <TabsContent value="devtools" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                <div className="p-4 bg-card border border-border space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] uppercase border border-border p-3 bg-secondary/10">
                    <div>
                      <span className="text-muted-foreground block text-[8px]">Auth Role:</span>
                      <span className="font-bold text-foreground">{profile?.role?.toUpperCase() || "SUPER_USER"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[8px]">Node ID:</span>
                      <span className="font-bold text-foreground truncate block">{user?.id?.slice(0, 8) || "DEV"}...</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[8px]">Environment:</span>
                      <span className="font-bold text-foreground">{process.env.NODE_ENV?.toUpperCase() || "DEV"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[8px]">RLS Security:</span>
                      <span className="font-bold text-emerald-500">ENFORCED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 border border-border bg-card space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-xs text-foreground">
                          <Rocket className="h-3.5 w-3.5 text-primary" /> Setup Wizard
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                          Relaunch onboarding setup wizard.
                        </p>
                      </div>
                      <Button 
                        onClick={() => { handleOpenChange(false); router.push("/?onboarding=true"); }}
                        variant="outline" 
                        className="w-full rounded-none uppercase text-[9px] font-bold tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        Start Setup Wizard
                      </Button>
                    </div>

                    <div className="p-3 border border-border bg-card space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-xs text-foreground">
                          <Zap className="h-3.5 w-3.5 text-purple-500" /> Probe AI Bridge
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                          Test AI model latency probe.
                        </p>
                      </div>
                      <Button 
                        onClick={handlePingGemini}
                        disabled={isPingingAI}
                        variant="outline" 
                        className="w-full rounded-none uppercase text-[9px] font-bold tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        {isPingingAI ? "PROBING..." : "TEST AI LATENCY"}
                      </Button>
                    </div>

                    <div className="p-3 border border-border bg-card space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-xs text-foreground">
                          <Database className="h-3.5 w-3.5 text-amber-500" /> Seed Default Rules
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                          Force-populate merchant categorization rules.
                        </p>
                      </div>
                      <Button 
                        onClick={handleSeedHabits}
                        disabled={isSeeding}
                        variant="outline" 
                        className="w-full rounded-none uppercase text-[9px] font-bold tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        {isSeeding ? "INJECTING..." : "SEED DEFAULT RULES"}
                      </Button>
                    </div>

                    <div className="p-3 border border-border bg-card space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-xs text-foreground">
                          <FileJson className="h-3.5 w-3.5 text-blue-500" /> Export JSON Log
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                          Download diagnostic telemetry dump.
                        </p>
                      </div>
                      <Button 
                        onClick={handleExportDiagnostics}
                        variant="outline" 
                        className="w-full rounded-none uppercase text-[9px] font-bold tracking-widest h-8 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        DOWNLOAD JSON LOG
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
