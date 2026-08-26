"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { 
  Landmark, Sparkles, Shield, ShieldOff, Sun, Moon, Check, Plus, Trash2, Sliders, 
  Database, Cpu, Calendar, CreditCard, RefreshCw, Terminal, Zap, Download, Rocket, 
  Activity, FileJson, Brain, LogOut, ArrowRight, ChevronDown, ShieldAlert, Smartphone, 
  Copy, ExternalLink, Globe, Layers, Search, Lock, Upload, FileSpreadsheet
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { ProLockOverlay } from "@/components/ProLockOverlay"
import { CancelProModal } from "@/components/CancelProModal"
import { DeviceSyncManager } from "@/components/DeviceSyncManager"
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
  const { 
    profile, 
    user, 
    isPrivacyMode, 
    setPrivacyMode, 
    refreshData, 
    refreshProfile, 
    currencySymbol, 
    isPro, 
    isLoading,
    upgradeToPro, 
    cancelPro, 
    signOut, 
    setSettingsOpen, 
    setSettingsActiveTab, 
    setSubscriptionOnly 
  } = useSystem()

  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("general")
  const [mounted, setMounted] = useState(false)

  // Form states
  const [keywordInput, setKeywordInput] = useState("")
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [paycheckFrequencyInput, setPaycheckFrequencyInput] = useState<"monthly" | "biweekly" | "weekly" | "calendar">("monthly")
  const [targetIncomeInput, setTargetIncomeInput] = useState("2500")
  const [targetSpendInput, setTargetSpendInput] = useState("1500")
  const [currencyInput, setCurrencyInput] = useState("EUR")
  const [languageInput, setLanguageInput] = useState("en-US")
  const [aiProviderInput, setAiProviderInput] = useState("gemini")
  const [customKeyInput, setCustomKeyInput] = useState("")
  const [decayInput, setDecayInput] = useState("0.12")
  const [aiYapLevelInput, setAiYapLevelInput] = useState<"concise" | "standard" | "verbose">("standard")
  const [halfLifeDaysInput, setHalfLifeDaysInput] = useState(15)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Rules & Habits state
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "dining", "transport"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [existingRules, setExistingRules] = useState<any[]>([])
  const [newRuleKw, setNewRuleKw] = useState("")
  const [newRuleCat, setNewRuleCat] = useState("")
  const [ruleSearchQuery, setRuleSearchQuery] = useState("")
  const [categories, setCategories] = useState<any[]>([])

  const router = useRouter()
  const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "super_user"
  const [isPingingAI, setIsPingingAI] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadRulesAndCategories()
  }, [])

  useEffect(() => {
    if (profile) {
      const kw = profile.paycheck_keyword || "SALARY"
      const freq = (profile.paycheck_frequency || "monthly").toLowerCase()
      setPaycheckFrequencyInput(freq as any)
      if (kw === "MONTHLY" || freq === "calendar") {
        setCycleMode("monthly")
        setPaycheckFrequencyInput("calendar")
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
      if (profile.decay_weight !== undefined && profile.decay_weight !== null) {
        const days = Math.round(Math.LN2 / Math.max(0.0001, Number(profile.decay_weight)))
        setHalfLifeDaysInput(Math.min(90, Math.max(1, days)))
      }
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSavingProfile(true)

    const isCal = cycleMode === "monthly" || paycheckFrequencyInput === "calendar"
    const finalKeyword = isCal ? "MONTHLY" : (keywordInput.trim() || "SALARY")
    const finalFrequency = isCal ? "calendar" : paycheckFrequencyInput
    const computedDecay = parseFloat((Math.LN2 / Math.max(1, halfLifeDaysInput)).toFixed(6))

    const { error } = await supabase
      .from("profiles")
      .update({ 
        paycheck_keyword: finalKeyword,
        paycheck_frequency: finalFrequency,
        target_monthly_income: parseFloat(targetIncomeInput) || 2500,
        target_monthly_spend: parseFloat(targetSpendInput) || 1500,
        currency: currencyInput,
        language: languageInput,
        ai_provider: aiProviderInput,
        custom_api_key: customKeyInput,
        decay_weight: computedDecay,
        ai_yap_level: isPro ? aiYapLevelInput : profile?.ai_yap_level || 'standard'
      })
      .eq("id", user.id)

    setIsSavingProfile(false)
    if (error) {
      toast.error("Failed to save system settings")
      console.error(error)
    } else {
      toast.success("System configuration saved successfully!")
      await refreshProfile()
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
    toast.success(`Successfully registered ${addedCount} merchant rules!`)
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

  const handleRightToErasure = async () => {
    const doubleConfirm = window.confirm(
      "WARNING: Permanently purge your profile and all transactions, budgets, limits, and settings?\n\nThis action CANNOT be undone."
    )
    if (!doubleConfirm) return

    const typingConfirm = window.prompt("Type 'DELETE MY DATA' below to confirm:")
    if (typingConfirm !== "DELETE MY DATA") {
      toast.error("Confirmation text did not match. Aborted.")
      return
    }

    const toastId = toast.loading("Purging profile...")
    try {
      const res = await fetch("/api/user/erase", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.dismiss(toastId)
        toast.success("Profile purged.")
        await signOut()
        router.push("/login")
      } else {
        toast.dismiss(toastId)
        toast.error(data.error || "Erasure failed.")
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error("Connection error during purge.")
    }
  }

  const handleLaunchOnboarding = () => {
    router.push("/?onboarding=true")
    toast.success("Relaunching onboarding wizard")
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

  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (format: "json" | "csv", type: "vault" | "transactions" | "portfolio" = "vault") => {
    setIsExporting(true)
    const toastId = toast.loading(`Generating ${format.toUpperCase()} export...`)
    try {
      const res = await fetch(`/api/user/export?format=${format}&type=${type}`)
      if (!res.ok) throw new Error("Export failed")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = type === "transactions" 
        ? `leger_transactions_${new Date().toISOString().split("T")[0]}.csv`
        : type === "portfolio"
        ? `leger_portfolio_${new Date().toISOString().split("T")[0]}.csv`
        : `leger_os_vault_backup_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.dismiss(toastId)
      toast.success(`${type === "vault" ? "Full vault backup" : type.toUpperCase()} downloaded successfully!`)
    } catch (e: any) {
      toast.dismiss(toastId)
      toast.error(e.message || "Failed to download export.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file type. Please upload a .json vault backup.")
      return
    }

    const confirmRestore = window.confirm(
      `Restore from "${file.name}"?\n\nThis will safely merge transactions, categories, budgets, and portfolio assets into your account with automatic deduplication.`
    )
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsRestoring(true)
    const toastId = toast.loading("Restoring vault backup...")
    try {
      const fileText = await file.text()
      const payload = JSON.parse(fileText)

      const res = await fetch("/api/user/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (data.success) {
        toast.dismiss(toastId)
        toast.success(data.message || "Vault successfully restored!")
        await refreshData()
        await refreshProfile()
        loadRulesAndCategories()
      } else {
        toast.dismiss(toastId)
        toast.error(data.error || "Restore failed.")
      }
    } catch (e: any) {
      toast.dismiss(toastId)
      toast.error(e.message || "Failed to parse or restore backup file.")
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const filteredRules = existingRules.filter(r => {
    if (!ruleSearchQuery.trim()) return true
    const q = ruleSearchQuery.toLowerCase()
    const cat = categories.find(c => c.id === r.category_id)
    return r.keyword.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q)
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-10 pb-36 md:pb-8 w-full font-mono"
    >
      {/* 1. Header & Summary Strip */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" />
            <span>Configuration Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            System Config
          </h1>
        </div>

        {/* Quick Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isPro ? (
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">PRO Active</span>
          ) : (
            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground bg-secondary/80 border border-border px-2.5 py-0.5">Core Free</span>
          )}

          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={() => setPrivacyMode(!isPrivacyMode)}
            className={cn(
              "h-8 px-3 text-[10px] uppercase font-bold border transition-colors flex items-center gap-1.5 cursor-pointer",
              isPrivacyMode 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20" 
                : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground"
            )}
            title="Toggle Privacy Safe-Deposit"
          >
            {isPrivacyMode ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
            <span>Privacy: {isPrivacyMode ? "ON" : "OFF"}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 px-3 text-[10px] uppercase font-bold border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Moon className="h-3.5 w-3.5 text-primary" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
            <span>{mounted && theme === "dark" ? "Dark" : "Light"}</span>
          </button>

          {/* Disconnect Session */}
          <button
            type="button"
            onClick={() => signOut()}
            className="h-8 px-3 text-[10px] uppercase font-bold border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-background transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. Main Organized Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
        <TabsList className={cn(
          "bg-secondary/40 border border-border rounded-none p-1.5 !h-auto w-full grid grid-cols-2 sm:grid-cols-5 gap-1.5",
          isSuperUser ? "sm:grid-cols-6" : "sm:grid-cols-5"
        )}>
          <TabsTrigger value="general" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2">
            <Sliders className="h-4 w-4 shrink-0" /> <span>General & Cycle</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2">
            <Brain className="h-4 w-4 shrink-0" /> <span>AI Engine</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" /> <span>Habits & Rules</span>
          </TabsTrigger>
          <TabsTrigger value="phone" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0" /> <span>Device Sync</span>
          </TabsTrigger>
          <TabsTrigger value="pro" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Sparkles className="h-4 w-4 shrink-0" /> <span>PRO Plan</span>
          </TabsTrigger>
          {isSuperUser && (
            <TabsTrigger value="devtools" className="rounded-none h-10 px-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 col-span-2 sm:col-span-1">
              <Terminal className="h-4 w-4 shrink-0" /> <span>Dev Tools</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: GENERAL & FINANCIAL CYCLE */}
        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 py-5 bg-secondary/10">
              <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4" /> Financial Cycle & Localization Architecture
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Configure your active paycheck cadence, base currency, system locale, and target ceilings.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Cadence Cards */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    Income Cadence & Paycheck Frequency
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    {[
                      { id: "monthly", title: "Monthly", subtitle: "Once a month (e.g. 25th)", isCalendar: false },
                      { id: "biweekly", title: "Bi-Weekly", subtitle: "Every 2 weeks (14 days)", isCalendar: false },
                      { id: "weekly", title: "Weekly", subtitle: "Every 7 days (e.g. Fridays)", isCalendar: false },
                      { id: "calendar", title: "Calendar Month", subtitle: "1st to 30th / 31st", isCalendar: true }
                    ].map((cadence) => {
                      const isLocked = !isPro && !cadence.isCalendar
                      const isSelected = cadence.id === "calendar"
                        ? cycleMode === "monthly" || paycheckFrequencyInput === "calendar"
                        : cycleMode === "keyword" && paycheckFrequencyInput === cadence.id

                      return (
                        <div 
                          key={cadence.id}
                          onClick={() => {
                            if (isLocked) {
                              setSettingsActiveTab("pro")
                              setSubscriptionOnly(true)
                              setSettingsOpen(true)
                              return
                            }
                            if (cadence.isCalendar) {
                              setCycleMode("monthly")
                              setPaycheckFrequencyInput("calendar")
                            } else {
                              setCycleMode("keyword")
                              setPaycheckFrequencyInput(cadence.id as any)
                            }
                          }}
                          className={cn(
                            "p-4 border cursor-pointer transition-all space-y-2 rounded-none flex flex-col justify-between select-none relative",
                            isLocked
                              ? "bg-card/40 border-border/60 opacity-60 hover:opacity-100"
                              : isSelected
                                ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground"
                                : "bg-card border-border hover:bg-secondary/20 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-widest text-xs font-mono">{cadence.title}</span>
                            {isLocked ? (
                              <Lock className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            ) : isSelected ? (
                              <Check className="h-4 w-4 text-emerald-500 stroke-[3] shrink-0" />
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                            {cadence.subtitle}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {paycheckFrequencyInput !== "calendar" && cycleMode !== "monthly" && (
                  <div className="space-y-1.5 bg-secondary/15 p-4 border border-border">
                    <Label htmlFor="paycheckKwInput" className="text-xs uppercase tracking-widest font-bold text-foreground">
                      Primary Employer / Paycheck Keyword
                    </Label>
                    <Input
                      id="paycheckKwInput"
                      placeholder="e.g. SALARY, PAYCHECK, DIRECT DEPOSIT..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="rounded-none text-xs uppercase bg-background border-border h-10 font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      * Deposits matching this keyword will automatically start and track your {paycheckFrequencyInput} payroll cycle.
                    </span>
                  </div>
                )}

                {/* Currency & Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="generalCurrency" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      Base Currency
                    </Label>
                    <div className="relative">
                      <select
                        id="generalCurrency"
                        value={currencyInput}
                        onChange={(e) => setCurrencyInput(e.target.value)}
                        className="w-full rounded-none text-xs h-10 bg-background border border-border px-3 pr-10 font-bold text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]: [string, { symbol: string; name: string }]) => (
                          <option key={code} value={code}>{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="generalLanguage" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      System Locale / Language
                    </Label>
                    <div className="relative">
                      <select
                        id="generalLanguage"
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="w-full rounded-none text-xs h-10 bg-background border border-border px-3 pr-10 font-bold text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]: [string, { name: string }]) => (
                          <option key={code} value={code}>{info.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Targets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="generalIncome" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      Target Monthly Income ({currencySymbol})
                    </Label>
                    <Input
                      id="generalIncome"
                      type="number"
                      value={targetIncomeInput}
                      onChange={(e) => setTargetIncomeInput(e.target.value)}
                      placeholder="2500"
                      className="rounded-none text-xs h-10 bg-background text-emerald-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="generalSpend" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      Target Spending Ceiling ({currencySymbol})
                    </Label>
                    <Input
                      id="generalSpend"
                      type="number"
                      value={targetSpendInput}
                      onChange={(e) => setTargetSpendInput(e.target.value)}
                      placeholder="1500"
                      className="rounded-none text-xs h-10 bg-background font-bold"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto px-8 h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-xs font-bold tracking-[0.2em] transition-all cursor-pointer"
                >
                  {isSavingProfile ? "SAVING CONFIGURATION..." : "SAVE GENERAL CONFIGURATION"}
                </Button>
              </form>

              {/* DATA PORTABILITY & VAULT BACKUP */}
              <div className="p-5 bg-secondary/10 border border-border space-y-4 pt-4">
                <div className="border-b border-border/40 pb-3">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-foreground font-bold flex items-center gap-1.5 font-mono">
                      <Database className="h-3.5 w-3.5 text-foreground" /> Data Portability & Vault Backup
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-sans mt-0.5">
                      Export full offline JSON backups or spreadsheet-ready CSV tables.
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleExport("json", "vault")}
                    disabled={isExporting}
                    className="w-full rounded-none h-10 text-xs uppercase font-mono font-bold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download Full Vault Snapshot (.JSON)
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      onClick={() => handleExport("csv", "transactions")}
                      disabled={isExporting}
                      variant="outline"
                      className="rounded-none h-9 text-[10px] uppercase font-mono font-bold bg-secondary/30 hover:bg-secondary/70 border-border text-foreground cursor-pointer flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" /> Ledger Transactions (.CSV)
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleExport("csv", "portfolio")}
                      disabled={isExporting}
                      variant="outline"
                      className="rounded-none h-9 text-[10px] uppercase font-mono font-bold bg-secondary/30 hover:bg-secondary/70 border-border text-foreground cursor-pointer flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" /> Portfolio Holdings (.CSV)
                    </Button>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Restore from Backup Snapshot</span>
                    <span className="text-[9px] text-muted-foreground font-sans">Automatic deduplication</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleRestoreFile}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    variant="outline"
                    className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold bg-card border-dashed border-border hover:bg-secondary/40 text-foreground cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" /> 
                    {isRestoring ? "Restoring Vault Data..." : "Choose .JSON Vault Backup"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AI INTELLIGENCE ENGINE */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 py-5 bg-secondary/10">
              <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Brain className="h-4 w-4" /> Neural Intelligence & Provider Bridge
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Configure your AI models, custom API keys, verbosity yap level, and mathematical recency decay.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="p-5 bg-secondary/10 border border-border space-y-4">
                  <div className="space-y-1 border-b border-border/40 pb-3">
                    <span className="text-xs uppercase tracking-widest text-foreground font-bold block">
                      Provider Selection & API Key
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Supply custom API credentials to run unthrottled natural language context and categorization.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="aiProvider" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        Model Provider
                      </Label>
                      <div className="relative">
                        <select
                          id="aiProvider"
                          value={aiProviderInput}
                          onChange={(e) => setAiProviderInput(e.target.value)}
                          className="w-full bg-background border border-input rounded-none h-10 px-3 pr-10 text-xs outline-none focus:border-foreground appearance-none font-bold text-foreground"
                        >
                          <option value="gemini">Google Gemini (Default - gemini-2.5-pro)</option>
                          <option value="openai">OpenAI (GPT-4o-mini)</option>
                          <option value="groq">Groq (Llama 3.3 70B Fast)</option>
                          <option value="ollama">Ollama (Local / Self-hosted)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="customApiKey" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex justify-between">
                        <span>Custom API Key / Endpoint</span>
                        {customKeyInput && <span className="text-emerald-500 font-bold lowercase">[key active]</span>}
                      </Label>
                      <Input
                        id="customApiKey"
                        type="password"
                        value={customKeyInput}
                        onChange={(e) => setCustomKeyInput(e.target.value)}
                        placeholder={aiProviderInput === "ollama" ? "http://localhost:11434" : "e.g. AIzaSy..."}
                        className="rounded-none text-xs h-10 bg-background"
                      />
                    </div>
                  </div>
                  {/* Yap Level & Recency Half-Life (PRO Gated) */}
                  {!isPro ? (
                    <ProLockOverlay 
                      compact
                      title="ADVANCED AI CALIBRATION (PRO)"
                      description="Custom AI verbosity responses, in-depth analytical reasoning, and empirical recency half-life parameters are exclusive to LEGER_OS PRO nodes."
                    />
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="aiYapLevel" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                            AI Response Verbosity / Depth
                          </Label>
                        </div>
                        <div className="relative">
                          <select
                            id="aiYapLevel"
                            value={aiYapLevelInput}
                            onChange={(e) => setAiYapLevelInput(e.target.value as any)}
                            className="w-full bg-background border border-input rounded-none h-10 px-3 pr-10 text-xs outline-none appearance-none font-bold text-foreground focus:border-foreground"
                          >
                            <option value="concise">Concise & Direct (Saves tokens, 1-2 bullet points)</option>
                            <option value="standard">Standard (Balanced context & suggestions)</option>
                            <option value="verbose">Verbose & Explanatory (Thorough projection breakdowns)</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      {/* Recency Half-Life Calibration (Mobile-Optimized Fast-Tap Presets + Stepper, No Sliders) */}
                      <div className="p-4 bg-secondary/10 border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-widest font-bold text-foreground">
                            Projection Half-Life Memory Window
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-500">
                            {halfLifeDaysInput} Days {halfLifeDaysInput === 15 ? "(Default)" : ""}
                          </span>
                        </div>

                        {/* Fast-Tap Preset Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { days: 7, label: "7 Days · Agile" },
                            { days: 15, label: "15 Days · Standard" },
                            { days: 30, label: "30 Days · Macro" }
                          ].map((preset) => (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() => setHalfLifeDaysInput(preset.days)}
                              className={`py-2 px-3 text-xs font-mono border text-center transition-all cursor-pointer ${
                                halfLifeDaysInput === preset.days
                                  ? "bg-foreground text-background border-foreground font-bold"
                                  : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Direct Stepper Input for Mobile */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setHalfLifeDaysInput(prev => Math.max(1, prev - 1))}
                            className="h-10 w-12 bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-foreground font-bold font-mono text-base active:scale-95 transition-transform cursor-pointer"
                            aria-label="Decrease days"
                          >
                            -
                          </button>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="1"
                              max="90"
                              value={halfLifeDaysInput}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                if (!isNaN(val)) setHalfLifeDaysInput(Math.min(90, Math.max(1, val)))
                              }}
                              className="w-full h-10 bg-background border border-border text-center font-mono font-bold text-sm text-foreground px-3 focus:border-foreground outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground pointer-events-none">
                              days
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHalfLifeDaysInput(prev => Math.min(90, prev + 1))}
                            className="h-10 w-12 bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-foreground font-bold font-mono text-base active:scale-95 transition-transform cursor-pointer"
                            aria-label="Increase days"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                          * Expenses within the last {halfLifeDaysInput} days carry &ge;50% statistical weight in the daily cash flow projection engine. Default is 15 days for optimal macro stability.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto px-8 h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-xs font-bold tracking-[0.2em] transition-all cursor-pointer"
                >
                  {isSavingProfile ? "SAVING AI ENGINE..." : "SAVE AI & ENGINE CONFIGURATION"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: HABITS & MERCHANT RULES */}
        <TabsContent value="habits" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 py-5 bg-secondary/10">
              <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4" /> Habit Clusters & Automatic Categorization Rules
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Seed pre-built European spending habits or register custom keyword merchant rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-6">
              {/* Presets Grid */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold block">
                  1. Pre-built Spending Habit Clusters
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HABIT_PRESETS.map((preset) => {
                    const isSelected = selectedHabits.includes(preset.id)
                    return (
                      <div
                        key={preset.id}
                        onClick={() => toggleHabit(preset.id)}
                        className={cn(
                          "p-3.5 border cursor-pointer transition-all flex flex-col justify-between space-y-2 rounded-none",
                          isSelected ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-75"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold uppercase tracking-wider text-xs block text-foreground">{preset.name}</span>
                            <span className="text-[9px] uppercase text-muted-foreground px-1.5 py-0.5 bg-secondary inline-block mt-1">
                              [{preset.category}]
                            </span>
                          </div>
                          <div className={cn("w-4 h-4 flex items-center justify-center border shrink-0 mt-0.5", isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background")}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                          {preset.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-secondary/20 border border-border">
                  <span className="text-xs uppercase text-muted-foreground">
                    Selected: <strong className="text-foreground">{selectedHabits.length}</strong> / {HABIT_PRESETS.length} Habit Clusters
                  </span>
                  <Button
                    onClick={handleSeedHabits}
                    disabled={isSeeding || selectedHabits.length === 0}
                    className="w-full sm:w-auto h-9 px-6 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase text-[10px] font-bold tracking-widest cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {isSeeding ? "REGISTERING RULES..." : `SEED RULES FOR ${selectedHabits.length} CLUSTERS`}
                  </Button>
                </div>
              </div>

              {/* Custom Rule Registration */}
              <div className="border-t border-border pt-6 space-y-4">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold block">
                  2. Register Custom Merchant Rule
                </span>
                <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Merchant Keyword (e.g. UBER EATS, APPLE, SPOTIFY)"
                    value={newRuleKw}
                    onChange={(e) => setNewRuleKw(e.target.value)}
                    className="rounded-none text-xs h-10 bg-background uppercase font-mono w-full sm:flex-1"
                  />
                  <div className="relative w-full sm:w-60">
                    <select
                      value={newRuleCat}
                      onChange={(e) => setNewRuleCat(e.target.value)}
                      className="bg-background border border-border rounded-none px-3 pr-8 text-xs font-mono h-10 outline-none w-full font-bold appearance-none"
                    >
                      <option value="">SELECT CATEGORY...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <Button type="submit" className="rounded-none uppercase font-mono text-[10px] font-bold h-10 px-6 w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
                  </Button>
                </form>

                {/* Active Rules List */}
                {existingRules.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">
                        Active Categorization Rules ({filteredRules.length} of {existingRules.length})
                      </span>
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filter rules..."
                          value={ruleSearchQuery}
                          onChange={(e) => setRuleSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-[10px] rounded-none bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto border border-border divide-y divide-border bg-card">
                      {filteredRules.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-[10px]">No matching rules found</div>
                      ) : (
                        filteredRules.map((rule) => {
                          const cat = categories.find(c => c.id === rule.category_id)
                          return (
                            <div key={rule.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-secondary/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-foreground uppercase">{rule.keyword}</span>
                                <span className="text-[9px] text-muted-foreground px-2 py-0.5 bg-secondary border border-border inline-flex items-center gap-1.5 font-mono uppercase">
                                  {cat && (
                                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                  )}
                                  <span>{cat?.name || "Unclassified"}</span>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Delete Rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DEVICE NOTIFICATION & PUSH SYNC */}
        <TabsContent value="phone" className="space-y-6">
          <Card className="rounded-none border-border bg-card shadow-lg pt-0">
            <CardHeader className="border-b border-border px-6 py-5 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <Smartphone className="h-4 w-4" /> Device Push Notification & Bank Listener Sync
                </CardTitle>
                {!isPro ? (
                  <span className="text-[8px] font-mono uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">
                    PRO TIER REQUIRED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">ACTIVE</span>
                )}
              </div>
              <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Autonomous real-time spending capture from Android Notification Listener, iOS Apple Shortcuts, or custom webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <DeviceSyncManager 
                user={user} 
                isPro={isPro} 
                isLoading={isLoading}
                onUpgradeClick={() => {
                  setActiveTab("pro")
                }} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PRO PLAN STATUS */}
        <TabsContent value="pro" className="space-y-6">
          <Card className="rounded-none border border-emerald-500/40 bg-card shadow-lg overflow-hidden pt-0">
            <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent px-6 py-5 border-b border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">
                  <Sparkles className="h-4 w-4" /> LEGER_OS PRO SUBSCRIPTION STATUS
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-foreground">
                  {isPro ? "UNLIMITED PREDICTIVE SIMULATIONS ACTIVE" : "UPGRADE TO AUTONOMOUS MAINFRAME ENGINE"}
                </h3>
              </div>
              {isPro ? (
                <span className="text-xs font-mono font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1">PRO Unlocked</span>
              ) : (
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground bg-secondary/80 border border-border px-3 py-1">Core Free Tier</span>
              )}
            </div>
            <CardContent className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs text-foreground">Recency Decay Modeling</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Unlocks exponential half-life calibration ($\lambda$) to adapt cash trajectory forecasts to lifestyle shifts.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs text-foreground">Conversational AI Overrides</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Set natural language assumptions in LEGER AI ("Reduce gas spend by 30%") to dynamically modify forecasts.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-secondary/10 border border-border">
                  <h4 className="font-bold uppercase text-xs text-foreground">Unlimited Neural Ingestion</h4>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Process multi-page PDF bank extracts and bulk OCR statements with zero throttling.
                  </p>
                </div>
              </div>

              {!isPro ? (
                <div className="pt-2 flex flex-col items-stretch gap-4 p-5 bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="font-bold uppercase text-sm text-foreground">Ready to upgrade your mainframe?</div>
                      <div className="text-xs text-muted-foreground font-sans mt-0.5">Instant activation. Cancel anytime.</div>
                    </div>
                    <Button
                      onClick={upgradeToPro}
                      className="w-full sm:w-auto px-8 h-11 rounded-none bg-emerald-500 hover:bg-emerald-600 text-black font-mono text-xs uppercase font-bold tracking-widest shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" /> Activate PRO Tier - €4.99/mo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-destructive/10 border border-destructive/30">
                  <div>
                    <div className="font-bold uppercase text-sm text-destructive">LEGER_OS PRO ACTIVE</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5 uppercase font-bold">Full access to predictive analytics, neural bridge and push sync.</div>
                  </div>
                  <Button
                    onClick={() => setIsCancelModalOpen(true)}
                    variant="outline"
                    className="w-full sm:w-auto px-8 h-11 rounded-none border-destructive text-destructive hover:bg-destructive/15 text-xs uppercase font-bold tracking-widest cursor-pointer"
                  >
                    Cancel PRO Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <CancelProModal 
            isOpen={isCancelModalOpen} 
            onClose={() => setIsCancelModalOpen(false)} 
          />
        </TabsContent>

        {/* TAB 6: DEV TOOLS (SUPER USERS ONLY) */}
        {isSuperUser && (
          <TabsContent value="devtools" className="space-y-6">
            <Card className="rounded-none border-border bg-card shadow-lg pt-0">
              <CardHeader className="border-b border-border px-6 py-5 bg-secondary/10">
                <CardTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <Terminal className="h-4 w-4" /> Super User Diagnostic Matrix
                </CardTitle>
                <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                  System diagnostics, bridge probing, and onboarding state testing.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs uppercase border border-border p-4 bg-secondary/10">
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Auth Role:</span>
                    <span className="font-bold text-foreground">{profile?.role?.toUpperCase() || "SUPER_USER"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Node ID:</span>
                    <span className="font-bold text-foreground truncate block">{user?.id?.slice(0, 8) || "DEV"}...</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Environment:</span>
                    <span className="font-bold text-foreground">{process.env.NODE_ENV?.toUpperCase() || "DEV"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">RLS Security:</span>
                    <span className="font-bold text-emerald-500">ENFORCED</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold uppercase text-xs text-foreground">
                        <Rocket className="h-4 w-4 text-primary" /> Onboarding Setup Wizard
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Relaunch interactive setup wizard to test paycheck configuration.
                      </p>
                    </div>
                    <Button 
                      onClick={handleLaunchOnboarding}
                      variant="outline" 
                      className="w-full rounded-none uppercase text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      Start Setup Wizard
                    </Button>
                  </div>

                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold uppercase text-xs text-foreground">
                        <Zap className="h-4 w-4 text-purple-500" /> Probe Neural Bridge
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Send a diagnostic ping to test AI response latency.
                      </p>
                    </div>
                    <Button 
                      onClick={handlePingGemini}
                      disabled={isPingingAI}
                      variant="outline" 
                      className="w-full rounded-none uppercase text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      {isPingingAI ? "PROBING..." : "TEST AI LATENCY"}
                    </Button>
                  </div>

                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold uppercase text-xs text-foreground">
                        <Database className="h-4 w-4 text-amber-500" /> Inject Default Rules
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Force-populate database with standard merchant categorization rules.
                      </p>
                    </div>
                    <Button 
                      onClick={handleSeedHabits}
                      disabled={isSeeding}
                      variant="outline" 
                      className="w-full rounded-none uppercase text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      {isSeeding ? "INJECTING..." : "SEED DEFAULT RULES"}
                    </Button>
                  </div>

                  <div className="p-4 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold uppercase text-xs text-foreground">
                        <FileJson className="h-4 w-4 text-blue-500" /> Export Diagnostic Dump
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                        Download JSON file containing system telemetry and session parameters.
                      </p>
                    </div>
                    <Button 
                      onClick={handleExportDiagnostics}
                      variant="outline" 
                      className="w-full rounded-none uppercase text-xs tracking-widest h-10 bg-secondary/40 hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      DOWNLOAD JSON LOG
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="p-4 bg-destructive/10 border border-destructive/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold uppercase text-xs text-destructive">
                      <ShieldAlert className="h-4 w-4" /> GDPR / FTC Right to Erasure
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Permanently purge account, transactions, budgets, limits, and settings.
                    </p>
                    <Button
                      onClick={handleRightToErasure}
                      variant="outline"
                      className="w-full rounded-none h-10 text-xs uppercase font-bold tracking-widest bg-destructive/10 text-destructive hover:bg-destructive hover:text-background border-destructive/30 cursor-pointer"
                    >
                      Purge Account & All Data
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
