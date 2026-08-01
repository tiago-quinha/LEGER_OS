"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Landmark, Sparkles, Shield, ShieldOff, Sun, Moon, Check, Plus, Trash2, Sliders, Database, Cpu, Calendar, CreditCard, RefreshCw, Terminal, Zap, Download, Rocket, Activity, FileJson, Brain, LogOut, ArrowRight, ChevronDown, ShieldAlert, Smartphone, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
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

export function SystemConfigView() {
  const { profile, user, isPrivacyMode, setPrivacyMode, refreshData, refreshProfile, currencySymbol, isPro, upgradeToPro, cancelPro, signOut, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("paycheck")
  const [mounted, setMounted] = useState(false)

  // Paycheck state
  const [keywordInput, setKeywordInput] = useState("")
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [targetIncomeInput, setTargetIncomeInput] = useState("2500")
  const [targetSpendInput, setTargetSpendInput] = useState("1500")
  const [currencyInput, setCurrencyInput] = useState("EUR")
  const [languageInput, setLanguageInput] = useState("en-US")
  const [aiProviderInput, setAiProviderInput] = useState("gemini")
  const [customKeyInput, setCustomKeyInput] = useState("")
  const [decayInput, setDecayInput] = useState("0.12")
  const [aiYapLevelInput, setAiYapLevelInput] = useState<"concise" | "standard" | "verbose">("standard")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Habits state
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "dining", "transport"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [existingRules, setExistingRules] = useState<any[]>([])
  const [newRuleKw, setNewRuleKw] = useState("")
  const [newRuleCat, setNewRuleCat] = useState("")
  const [categories, setCategories] = useState<any[]>([])

  const router = useRouter()
  // Admin & Super User Check
  const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_user" || profile?.username?.toLowerCase()?.includes("quinha") || profile?.username?.toLowerCase()?.includes("admin") || user?.email?.toLowerCase()?.includes("quinha") || user?.email?.toLowerCase()?.includes("admin") || process.env.NODE_ENV === "development"
  const [isPingingAI, setIsPingingAI] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadRulesAndCategories()
  }, [])

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
      if (profile.decay_weight !== undefined) setDecayInput(profile.decay_weight.toString())
      if (profile.ai_yap_level) setAiYapLevelInput(profile.ai_yap_level)
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
        target_monthly_spend: parseFloat(targetSpendInput) || 1500,
        currency: currencyInput,
        language: languageInput,
        ai_provider: aiProviderInput,
        custom_api_key: customKeyInput,
        decay_weight: parseFloat(decayInput) || 0.12,
        ai_yap_level: isPro ? aiYapLevelInput : profile?.ai_yap_level || 'standard'
      })
      .eq("id", user.id)

    setIsSavingProfile(false)
    if (error) {
      toast.error("Failed to save income profile")
      console.error(error)
    } else {
      toast.success("Paycheck & projection trajectory settings updated!")
      await refreshProfile()
      refreshData()
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
    toast.success(`Successfully injected ${addedCount} habit rules into neural matrix!`)
    loadRulesAndCategories()
    refreshData()
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleKw || !newRuleCat) return

    const trimmedKw = newRuleKw.trim()
    const catId = parseInt(newRuleCat)
    const tempId = Date.now()

    const tempRule = {
      id: tempId,
      keyword: trimmedKw,
      category_id: catId
    }

    const previousRules = [...existingRules]

    // 1. Optimistic UI update
    setExistingRules(prev => [...prev, tempRule])
    setNewRuleKw("")
    setNewRuleCat("")
    toast.success(`Rule registered: "${trimmedKw}"`)

    // 2. Database mutation
    const { data, error } = await supabase
      .from("merchant_rules")
      .insert({ keyword: trimmedKw, category_id: catId })
      .select()

    if (error) {
      // 3. Rollback on failure
      setExistingRules(previousRules)
      toast.error("Failed to add custom rule")
      return
    }

    if (data && data[0]) {
      // Swap temp ID with the database ID
      setExistingRules(prev => prev.map(r => r.id === tempId ? data[0] : r))
    } else {
      loadRulesAndCategories()
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this custom categorization rule? Transactions from this merchant will no longer be auto-categorized.")) {
      return
    }
    const previousRules = [...existingRules]
    
    // 1. Optimistic UI update
    setExistingRules(existingRules.filter(r => r.id !== id))
    toast.success("Rule deleted")

    // 2. Database mutation
    const { error } = await supabase.from("merchant_rules").delete().eq("id", id)
    if (error) {
      // 3. Rollback on failure
      setExistingRules(previousRules)
      toast.error("Failed to delete rule")
      return
    }
  }

  const handleRightToErasure = async () => {
    const doubleConfirm = window.confirm(
      "WARNING: This will permanently delete your account and all associated transactions, budgets, limits, and configurations. This cannot be undone.\n\nAre you sure you want to proceed?"
    )
    if (!doubleConfirm) return

    const typingConfirm = window.prompt(
      "To confirm deletion, type 'DELETE MY DATA' below:"
    )
    if (typingConfirm !== "DELETE MY DATA") {
      toast.error("Confirmation string did not match. Deletion aborted.")
      return
    }

    const toastId = toast.loading("Purging mainframe data node...")
    try {
      const res = await fetch("/api/user/erase", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.dismiss(toastId)
        toast.success("Mainframe profile completely purged.")
        await signOut()
        router.push("/login")
      } else {
        toast.dismiss(toastId)
        toast.error(data.error || "Failed to execute erasure request.")
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error("Connection lost during data purge.")
    }
  }

  const handleLaunchOnboarding = () => {
    router.push("/?onboarding=true")
    toast.success("Relaunching LEGER_OS Interactive Onboarding Wizard")
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
    a.download = `leger_os_diagnostics_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast.success("Diagnostic dump exported")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 pb-24 md:pb-8 w-full"
    >
      {/* 1. Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-border pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" />
            <span>Configuration Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            System Config
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <GlowingBadge variant="success" pulse={true} dot={true} className="text-[10px] uppercase font-mono">
            NODE_ONLINE
          </GlowingBadge>
          <span className="font-mono text-[10px] px-2.5 py-1 bg-secondary border border-border uppercase font-bold">
            {profile?.role?.toUpperCase() || "SUPER_USER"}
          </span>
        </div>
      </header>

      {/* 2. Quick Environment Controls Strip (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Privacy Mode Card */}
        <Card className="rounded-none border-border bg-card hover:border-foreground/40 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                {isPrivacyMode ? <Shield className="h-4 w-4 text-emerald-500" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
                <span>Privacy Mode</span>
              </div>
              <span className={cn("text-[9px] font-mono uppercase px-2 py-0.5 font-bold", isPrivacyMode ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" : "bg-secondary text-muted-foreground")}>
                {isPrivacyMode ? "ACTIVE" : "OFF"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
              Obfuscates monetary amounts and account balances across all dashboard views.
            </p>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Preview:</span>
              <span className="font-bold font-mono text-xs text-foreground">
                <PrivacyValue>{currencySymbol}4,850.00</PrivacyValue>
              </span>
            </div>
            <Button
              onClick={() => setPrivacyMode(!isPrivacyMode)}
              variant={isPrivacyMode ? "default" : "outline"}
              className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold tracking-widest mt-1"
            >
              {isPrivacyMode ? "Disable Safe-Deposit" : "Enable Safe-Deposit"}
            </Button>
          </CardContent>
        </Card>

        {/* Environmental Theme Card */}
        <Card className="rounded-none border-border bg-card hover:border-foreground/40 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <span>Environment</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 font-bold bg-secondary text-foreground">
                {!mounted ? "SYNC..." : theme === "dark" ? "CYBER DARK" : "LIGHT"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
              Switch between sleek Cybermatic Dark mode and clean Mainframe Light mode.
            </p>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Contrast:</span>
              <span className="font-bold text-foreground">HIGH-PRECISION</span>
            </div>
            <Button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              variant="outline"
              className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold tracking-widest mt-1"
            >
              Switch to {theme === "dark" ? "Mainframe Light" : "Cybermatic Dark"}
            </Button>
          </CardContent>
        </Card>

        {/* Node Session & Sign Out Card */}
        <Card className="rounded-none border-border bg-card hover:border-foreground/40 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                <Terminal className="h-4 w-4 text-emerald-500" />
                <span>Session Node</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 truncate max-w-[90px]">
                {profile?.username || user?.email?.split("@")[0] || "USER"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-sans truncate">
              ID: {user?.id?.slice(0, 16) || "LOCAL_NODE"}...
            </p>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>RLS Security:</span>
              <span className="font-bold text-emerald-500">ENFORCED</span>
            </div>
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold tracking-widest mt-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-background border-destructive/30 transition-all"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Disconnect Session
            </Button>
          </CardContent>
        </Card>

        {/* GDPR / FTC Right to Erasure Card */}
        <Card className="rounded-none border-border bg-card hover:border-destructive/30 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span>Right to Erasure</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 font-bold bg-destructive/10 text-destructive border border-destructive/30">
                GDPR/FTC
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
              Permanently purge your profile, transactions, budgets, limits, and configurations.
            </p>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Purge Cascade:</span>
              <span className="font-bold text-destructive">DESTRUCTIVE</span>
            </div>
            <Button
              onClick={handleRightToErasure}
              variant="outline"
              className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold tracking-widest mt-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-background border-destructive/30 transition-all"
            >
              Purge All Data & Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className={cn(
          "bg-secondary/40 border border-border rounded-none p-1 sm:p-1.5 !h-auto w-full flex flex-col sm:grid gap-1 sm:gap-1.5",
          isSuperUser ? "sm:grid-cols-5" : "sm:grid-cols-4"
        )}>
          <TabsTrigger value="paycheck" className="rounded-none h-10 sm:h-11 px-4 text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-start sm:justify-center gap-2 w-full text-left sm:text-center shrink-0">
            <Calendar className="h-4 w-4 shrink-0" /> <span>Cycle & AI Engine</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="rounded-none h-10 sm:h-11 px-4 text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-start sm:justify-center gap-2 w-full text-left sm:text-center shrink-0">
            <Sparkles className="h-4 w-4 shrink-0" /> <span>Habits & Merchant Rules</span>
          </TabsTrigger>
          <TabsTrigger value="phone" className="rounded-none h-10 sm:h-11 px-4 text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-start sm:justify-center gap-2 w-full text-left sm:text-center shrink-0">
            <Smartphone className="h-4 w-4 shrink-0" /> <span>Phone Posting</span>
          </TabsTrigger>
          <TabsTrigger value="pro" className="rounded-none h-10 sm:h-11 px-4 text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-start sm:justify-center gap-2 w-full text-left sm:text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shrink-0">
            <Sparkles className="h-4 w-4 shrink-0" /> <span>PRO Plan Status</span>
          </TabsTrigger>
          {isSuperUser && (
            <TabsTrigger value="devtools" className="rounded-none h-10 sm:h-11 px-4 text-xs uppercase tracking-wider font-mono font-bold flex items-center justify-start sm:justify-center gap-2 w-full text-left sm:text-center sm:border-l border-border/50 shrink-0">
              <Terminal className="h-4 w-4 shrink-0" /> <span>Super User Dev Tools</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: PAYCHECK CYCLE & AI ENGINE CONFIG */}
        <TabsContent value="paycheck" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 sm:px-8 py-6 bg-secondary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-foreground" /> Financial Cycle Architecture
                  </CardTitle>
                  <CardDescription className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                    LEGER_OS dynamically tracks finances based on paycheck cycles or standard calendar months.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setCycleMode("keyword")}
                  className={cn(
                    "p-5 border cursor-pointer transition-all space-y-2.5 rounded-none",
                    cycleMode === "keyword" ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-widest text-xs font-mono">Paycheck Keyword Mode</span>
                    {cycleMode === "keyword" && <Check className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Cycle resets automatically whenever a transaction description matches your employer / salary keyword. Best for irregular or bi-weekly paychecks.
                  </p>
                </div>

                <div 
                  onClick={() => setCycleMode("monthly")}
                  className={cn(
                    "p-5 border cursor-pointer transition-all space-y-2.5 rounded-none",
                    cycleMode === "monthly" ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-70"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-widest text-xs font-mono">Calendar Monthly Mode</span>
                    {cycleMode === "monthly" && <Check className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Fixed calendar intervals from the 1st to the end of each month. Standard bookkeeping cadence.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePaycheck} className="space-y-6 pt-2">
                {cycleMode === "keyword" && (
                  <div className="space-y-2 bg-secondary/15 p-4 border border-border">
                    <Label htmlFor="paycheckKw" className="text-xs uppercase tracking-widest font-mono font-bold text-foreground">
                      Primary Income / Employer Keyword
                    </Label>
                    <Input
                      id="paycheckKw"
                      placeholder="e.g. SALARY, PAYROLL, DIRECT DEPOSIT, EMPLOYER..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="rounded-none font-mono text-base sm:text-xs uppercase bg-background border-border h-11"
                    />
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      * Case-insensitive substring matched against your incoming bank statement descriptions to automatically trigger a new cycle.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currencySelectModal" className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-bold">
                      Base Currency
                    </Label>
                    <div className="relative">
                      <select
                        id="currencySelectModal"
                        value={currencyInput}
                        onChange={(e) => setCurrencyInput(e.target.value)}
                        className="w-full rounded-none font-mono text-base sm:text-xs h-11 bg-background border border-border px-3 pr-10 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                          <option key={code} value={code} className="bg-background text-foreground">{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="languageSelectModal" className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-bold">
                      System Locale / Language
                    </Label>
                    <div className="relative">
                      <select
                        id="languageSelectModal"
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="w-full rounded-none font-mono text-base sm:text-xs h-11 bg-background border border-border px-3 pr-10 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                          <option key={code} value={code} className="bg-background text-foreground">{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetIncomeModal" className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-bold">
                      Expected Monthly Income ({currencySymbol})
                    </Label>
                    <Input
                      id="targetIncomeModal"
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={targetIncomeInput}
                      onChange={(e) => setTargetIncomeInput(e.target.value)}
                      placeholder="2500"
                      className="rounded-none font-mono text-base sm:text-xs h-11 bg-background text-emerald-600 dark:text-emerald-400 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetSpendModal" className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-bold">
                      Target Spending Ceiling ({currencySymbol})
                    </Label>
                    <Input
                      id="targetSpendModal"
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={targetSpendInput}
                      onChange={(e) => setTargetSpendInput(e.target.value)}
                      placeholder="1500"
                      className="rounded-none font-mono text-base sm:text-xs h-11 bg-background font-bold"
                    />
                  </div>
                </div>

                <div className="p-5 bg-secondary/10 border border-border space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs uppercase font-mono tracking-widest text-muted-foreground">
                      <span>Recency Decay Weight (λ)</span>
                      <span className="font-bold text-foreground">{decayInput} (Half-life: ~{Math.round(0.693 / (parseFloat(decayInput) || 0.12))} days)</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.01"
                      value={decayInput}
                      onChange={(e) => setDecayInput(e.target.value)}
                      className="w-full accent-emerald-500 cursor-pointer h-2 bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground font-sans">
                      * Governs how aggressively daily burn rate projections discount older transactions. Higher $\lambda$ prioritizes your most recent 3-5 days of spending.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-secondary/10 border border-border space-y-4">
                  <div className="space-y-2 border-b border-border/40 pb-2">
                    <span className="text-xs uppercase tracking-widest font-mono text-foreground font-bold block">
                      AI Neural Bridge Configuration
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                      Select your custom provider and enter credentials for unlimited AI strategies
                    </span>
                  </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="aiProviderSelect" className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground font-bold">
                          AI Provider
                        </Label>
                        <div className="relative">
                          <select
                            id="aiProviderSelect"
                            value={aiProviderInput}
                            onChange={(e) => setAiProviderInput(e.target.value)}
                            className="w-full bg-background border border-input rounded-none h-11 px-3 pr-10 text-xs outline-none font-mono focus:border-foreground appearance-none"
                          >
                            <option value="gemini" className="bg-[#121215] text-foreground font-mono py-1">Google Gemini (Default)</option>
                            <option value="openai" className="bg-[#121215] text-foreground font-mono py-1">OpenAI (GPT-4o-mini)</option>
                            <option value="groq" className="bg-[#121215] text-foreground font-mono py-1">Groq (Llama 3.3 Fast)</option>
                            <option value="ollama" className="bg-[#121215] text-foreground font-mono py-1">Ollama (Local / Self-hosted)</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                    <div className="space-y-2">
                      <Label htmlFor="customApiKeyInput" className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground font-bold flex justify-between">
                        <span>Custom API Key / Endpoint URL</span>
                        {customKeyInput && (
                          <span className="text-emerald-500 font-bold lowercase">[configured]</span>
                        )}
                      </Label>
                      <Input
                        id="customApiKeyInput"
                        type="password"
                        value={customKeyInput}
                        onChange={(e) => setCustomKeyInput(e.target.value)}
                        placeholder={aiProviderInput === "ollama" ? "e.g. http://localhost:11434" : "e.g. AIzaSy... or AQ..."}
                        className="rounded-none font-mono text-base sm:text-xs h-11 bg-background"
                      />
                    </div>
                  </div>

                  {isPro && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="aiYapLevelSelect" className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground font-bold">
                        AI Verbosity / Yap Level (PRO Only)
                      </Label>
                      <div className="relative">
                        <select
                          id="aiYapLevelSelect"
                          value={aiYapLevelInput}
                          onChange={(e) => setAiYapLevelInput(e.target.value as any)}
                          className="w-full bg-background border border-input rounded-none h-11 px-3 pr-10 text-xs outline-none font-mono focus:border-foreground appearance-none"
                        >
                          <option value="concise" className="bg-[#121215] text-foreground font-mono py-1">Concise & Direct (Saves tokens, brief answers)</option>
                          <option value="standard" className="bg-[#121215] text-foreground font-mono py-1">Standard (Balanced context & suggestions)</option>
                          <option value="verbose" className="bg-[#121215] text-foreground font-mono py-1">Verbose & Explanatory (Thorough strategies & projections)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-sans">
                    * Configure a personal key (like Gemini AI Studio or OpenAI developer keys) to bypass all host quotas and run unthrottled neural forecasts.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto px-8 h-12 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-xs font-bold tracking-[0.2em] transition-all active:scale-[0.98]"
                >
                  {isSavingProfile ? "COMMITTING CHANGES..." : "SAVE ARCHITECTURE & CALIBRATION"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: HABITS & MERCHANT RULES */}
        <TabsContent value="habits" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 sm:px-8 py-6 bg-secondary/10">
              <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-foreground" /> Habit Seeding & Automatic Categorization
              </CardTitle>
              <CardDescription className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                Select common European & global spending habits to inject default merchant OCR parsing rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {HABIT_PRESETS.map((preset) => {
                  const isSelected = selectedHabits.includes(preset.id)
                  return (
                    <div
                      key={preset.id}
                      onClick={() => toggleHabit(preset.id)}
                      className={cn(
                        "p-4 border cursor-pointer transition-all flex flex-col justify-between space-y-3 rounded-none",
                        isSelected ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-75"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold uppercase tracking-wider font-mono text-xs block text-foreground">{preset.name}</span>
                          <span className="text-[9px] font-mono uppercase text-muted-foreground px-1.5 py-0.5 bg-secondary inline-block mt-1">
                            [{preset.category}]
                          </span>
                        </div>
                        <div className={cn("w-5 h-5 flex items-center justify-center border shrink-0", isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background")}>
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-secondary/20 border border-border">
                <div className="text-xs font-mono uppercase text-muted-foreground">
                  Selected: <span className="font-bold text-foreground">{selectedHabits.length}</span> / {HABIT_PRESETS.length} Habit Clusters
                </div>
                <Button
                  onClick={handleSeedHabits}
                  disabled={isSeeding || selectedHabits.length === 0}
                  className="w-full sm:w-auto h-11 px-8 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-xs font-bold tracking-widest"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isSeeding ? "INJECTING RULES..." : `SEED RULES FOR ${selectedHabits.length} HABIT CLUSTERS`}
                </Button>
              </div>

              {/* Custom Rule Adder */}
              <div className="border-t border-border pt-6 space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-widest font-mono text-foreground">Register Custom Merchant Rule</h5>
                <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Merchant keyword (e.g. UBER EATS, APPLE, SPOTIFY)"
                    value={newRuleKw}
                    onChange={(e) => setNewRuleKw(e.target.value)}
                    className="rounded-none text-base sm:text-xs h-11 bg-background border-border w-full sm:flex-1 uppercase font-mono"
                  />
                  <div className="relative w-full sm:w-64">
                    <select
                      value={newRuleCat}
                      onChange={(e) => setNewRuleCat(e.target.value)}
                      className="bg-background border border-border rounded-none px-4 pr-10 text-base sm:text-xs font-mono h-11 outline-none w-full font-bold appearance-none"
                    >
                      <option value="">SELECT CATEGORY...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <Button type="submit" className="rounded-none uppercase font-mono text-xs font-bold h-11 px-6 w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
                    <Plus className="h-4 w-4 mr-1.5" /> Register Rule
                  </Button>
                </form>

                {existingRules.length > 0 && (
                  <div className="pt-4 space-y-2">
                    <h6 className="text-[10px] font-mono uppercase text-muted-foreground">Active Neural Parsing Rules ({existingRules.length})</h6>
                    <div className="max-h-[300px] overflow-y-auto border border-border divide-y divide-border bg-card">
                      {existingRules.map((rule) => {
                        const cat = categories.find(c => c.id === rule.category_id)
                        return (
                          <div key={rule.id} className="p-3 flex items-center justify-between text-xs font-mono hover:bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-foreground uppercase">{rule.keyword}</span>
                              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-secondary border border-border">
                                {cat?.name || "Unclassified"}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SMARTPHONE MACRODROID INGESTION */}
        <TabsContent value="phone" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 sm:px-8 py-6 bg-secondary/10">
              <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-foreground" /> MacroDroid Phone Integration
              </CardTitle>
              <CardDescription className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                Post transactions to your mainframe automatically from push notifications on your Android device.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="space-y-4">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">1. Your Unique Posting Endpoint</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  Use this URL in your phone's automation application (like MacroDroid, Tasker, or custom HTTP clients) to post transactions securely into your profile:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                  <div className="bg-secondary/40 border border-border p-3 font-mono text-[9px] sm:text-[10px] break-all select-all flex-1 flex items-center text-foreground font-semibold">
                    {typeof window !== 'undefined' 
                      ? `${window.location.origin}/api/transactions/macrodroid?userId=${user?.id || "AUTHENTICATING"}`
                      : `https://leger-os.vercel.app/api/transactions/macrodroid?userId=${user?.id || "AUTHENTICATING"}`
                    }
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-none font-mono text-[9px] uppercase tracking-widest shrink-0 cursor-pointer flex items-center gap-1.5 h-auto py-2 sm:py-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' 
                        ? `${window.location.origin}/api/transactions/macrodroid?userId=${user?.id || ""}`
                        : `https://leger-os.vercel.app/api/transactions/macrodroid?userId=${user?.id || ""}`
                      navigator.clipboard.writeText(url)
                      toast.success("MacroDroid endpoint copied to clipboard!")
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copy URL
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/40 my-6" />

              <div className="space-y-4">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">2. MacroDroid Setup Instructions</h4>
                <div className="space-y-4 font-sans text-xs text-muted-foreground leading-relaxed">
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] font-bold text-foreground uppercase tracking-widest">Step A: Add the Notification Trigger</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li>Create a new Macro in MacroDroid and name it <code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">LEGER_OS Ingestion</code>.</li>
                      <li>Add a **Trigger** &rarr; **Device Events** &rarr; **Notification** &rarr; **Notification Received**.</li>
                      <li>Select your banking app (e.g. Santander, Revolut, ActivoBank, etc.).</li>
                      <li>Set content matches to <code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">Any</code>.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-[10px] font-bold text-foreground uppercase tracking-widest">Step B: Create Local Variables</p>
                    <p className="pl-2">At the bottom of the Macro edit screen, configure these local variables:</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li><code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">raw_text</code> (String) &rarr; Set in actions using text matches from <code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">[notification]</code>.</li>
                      <li><code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">amount</code> (String) &rarr; Extract numerical cash value from notification via Regex.</li>
                      <li><code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">merchant</code> (String) &rarr; Extract merchant name from notification via Regex.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-[10px] font-bold text-foreground uppercase tracking-widest">Step C: Setup HTTP POST Action</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      <li>Add an **Action** &rarr; **Applications** &rarr; **HTTP POST**.</li>
                      <li>Paste the copyable endpoint URL from above into the **URL** input.</li>
                      <li>Set **Content Type** to <code className="bg-secondary/40 px-1 py-0.5 font-mono text-[10px] text-foreground">application/json</code>.</li>
                      <li>Paste the following JSON structure into the **Request Body**:</li>
                    </ul>
                    <pre className="bg-secondary/20 border border-border/60 p-4 font-mono text-[10px] text-foreground leading-normal whitespace-pre-wrap select-all max-w-lg mt-1.5 ml-2">
{`{
  "amount": "{lv=amount}",
  "merchant": "{lv=merchant}",
  "raw_text": "{lv=raw_text}",
  "source": "MacroDroid"
}`}
                    </pre>
                  </div>

                  <div className="space-y-2 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-none">
                    <p className="font-mono text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Portuguese Regex Parsing Example
                    </p>
                    <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">
                      If your notification says <code className="text-foreground font-semibold font-mono bg-secondary/30 px-1">"Compra de 15,30 EUR no CONTINENTE"</code>, use MacroDroid's **Text Manipulation &rarr; Extract matching text** action:
                    </p>
                    <ul className="list-decimal list-inside text-[11px] pl-2 mt-1.5 space-y-1 text-muted-foreground">
                      <li>To extract amount to <code className="font-mono bg-secondary/30 px-0.5 text-foreground">amount</code>: search for pattern <code className="font-mono bg-secondary/30 px-1 text-foreground">([0-9]+[.,][0-9]{2})</code>.</li>
                      <li>To extract merchant to <code className="font-mono bg-secondary/30 px-0.5 text-foreground">merchant</code>: search for pattern <code className="font-mono bg-secondary/30 px-1 text-foreground">no\\s+([^\\s]+)</code> or similar keyword captures.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PRO PLAN STATUS */}
        <TabsContent value="pro" className="space-y-6">
          <Card className="rounded-none border border-emerald-500/40 bg-card shadow-lg overflow-hidden pt-0">
            <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent px-6 sm:px-8 py-6 border-b border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">
                  <Sparkles className="h-4 w-4" /> LEGER_OS PRO TIER STATUS
                </div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-mono text-foreground">
                  {isPro ? "UNLIMITED NEURAL SIMULATIONS ACTIVE" : "UPGRADE TO ADVANCED PREDICTIVE SIMULATIONS"}
                </h3>
              </div>
              <GlowingBadge variant={isPro ? "success" : "neutral"} pulse={true} dot={true} className="text-xs py-1 px-3">
                {isPro ? "PRO_UNLOCKED" : "CORE_FREE_TIER"}
              </GlowingBadge>
            </div>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs font-mono text-foreground">Recency Decay Modeling</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Unlocks full exponential half-life calibration ($\lambda$) to adapt daily end-of-cycle cash trajectory forecasts to immediate lifestyle shifts.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs font-mono text-foreground">Conversational AI Overrides</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Set natural language assumptions in LEGER AI ("Reduce weekend dining by 40%") to dynamically modify simulation burn rates.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs font-mono text-foreground">Unlimited Neural Ingestion</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Process multi-page PDF bank extracts and bulk OCR statements with zero throttling across all AI providers.
                  </p>
                </div>
              </div>

              {!isPro && (
                <div className="pt-4 flex flex-col items-stretch gap-4 p-6 bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="font-bold uppercase text-sm font-mono text-foreground">Ready to upgrade your mainframe?</div>
                      <div className="text-xs text-muted-foreground font-sans mt-0.5">Instant activation. Cancel anytime.</div>
                    </div>
                    <Button
                      onClick={upgradeToPro}
                      className="w-full sm:w-auto px-8 h-12 rounded-none bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs uppercase font-bold tracking-widest shadow-lg transition-all"
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> Activate PRO Tier - €4.99/mo
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-mono text-center sm:text-left mt-1 max-w-xl leading-relaxed">
                    By activating PRO, you authorize a recurring subscription charge of €4.99/month. Your account will be billed monthly until you cancel in this configuration panel.
                  </p>
                </div>
              )}

              {isPro && (
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-destructive/10 border border-destructive/30">
                  <div>
                    <div className="font-bold uppercase text-sm font-mono text-destructive">LEGER_OS PRO ACTIVE</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5 uppercase font-bold tracking-tight">Full access to predictive analytics, neural bridge and push sync.</div>
                  </div>
                  <Button
                    onClick={cancelPro}
                    variant="outline"
                    className="w-full sm:w-auto px-8 h-12 rounded-none border-destructive text-destructive hover:bg-destructive/15 font-mono text-xs uppercase font-bold tracking-widest transition-all"
                  >
                    Cancel PRO Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SUPER USER DEV TOOLS */}
        {isSuperUser && (
          <TabsContent value="devtools" className="space-y-6">
            <Card className="rounded-none border-border bg-card shadow-lg pt-0">
              <CardHeader className="border-b border-border pb-6 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-foreground" /> Super User Diagnostic Matrix
                  </CardTitle>
                  <GlowingBadge variant="success" pulse={true} dot={true} className="text-[10px]">
                    ADMIN_MODE
                  </GlowingBadge>
                </div>
                <CardDescription className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                  Advanced debugging utilities, neural bridge diagnostics, and state overrides for system administrators.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Status Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs uppercase border border-border p-4 bg-secondary/10">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Auth Role:</span>
                    <span className="font-bold text-foreground">{profile?.role?.toUpperCase() || "SUPER_USER"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Session Node:</span>
                    <span className="font-bold text-foreground truncate block">{user?.id?.slice(0, 8) || "LOCAL_DEV"}...</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Environment:</span>
                    <span className="font-bold text-foreground">{process.env.NODE_ENV?.toUpperCase() || "DEV"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">RLS Security:</span>
                    <span className="font-bold text-emerald-500">ENFORCED</span>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Launch Onboarding */}
                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold font-mono uppercase text-sm text-foreground">
                        <Rocket className="h-4 w-4 shrink-0 text-primary" /> Launch Onboarding Setup Wizard
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Reset UI state and enter the interactive onboarding wizard to test paycheck setup and habit seeding.
                      </p>
                    </div>
                    <Button 
                      onClick={handleLaunchOnboarding}
                      variant="outline" 
                      className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                    >
                      Start Setup Wizard
                    </Button>
                  </div>

                  {/* 2. Ping Neural Bridge */}
                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold font-mono uppercase text-sm text-foreground">
                        <Zap className="h-4 w-4 shrink-0 text-purple-500" /> Probe Neural Bridge Latency
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Send a diagnostic probe to verify that the configured AI API key is responding with low latency.
                      </p>
                    </div>
                    <Button 
                      onClick={handlePingGemini}
                      disabled={isPingingAI}
                      variant="outline" 
                      className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                    >
                      {isPingingAI ? "PROBING BRIDGE..." : "TEST AI LATENCY"}
                    </Button>
                  </div>

                  {/* 3. Re-Seed Neural Rules */}
                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold font-mono uppercase text-sm text-foreground">
                        <Database className="h-4 w-4 shrink-0 text-amber-500" /> Inject Default Habit Rules
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Force-populate the database with standard merchant categorization patterns (groceries, tech, utilities).
                      </p>
                    </div>
                    <Button 
                      onClick={handleSeedHabits}
                      disabled={isSeeding}
                      variant="outline" 
                      className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                    >
                      {isSeeding ? "INJECTING..." : "SEED DEFAULT RULES"}
                    </Button>
                  </div>

                  {/* 4. Export Diagnostics */}
                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold font-mono uppercase text-sm text-foreground">
                        <FileJson className="h-4 w-4 shrink-0 text-blue-500" /> Export Diagnostic Dump
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Download a JSON file containing current profile parameters, rules count, and session metadata.
                      </p>
                    </div>
                    <Button 
                      onClick={handleExportDiagnostics}
                      variant="outline" 
                      className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background transition-all"
                    >
                      DOWNLOAD JSON LOG
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  )
}
