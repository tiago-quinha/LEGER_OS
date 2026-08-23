"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
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
  Database, FileJson, Rocket, Landmark, Lock, CreditCard, Download, Upload, FileSpreadsheet,
  MessageSquare, Clock, CheckCircle2, AlertCircle, RefreshCw, Send, MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { ProLockOverlay } from "@/components/ProLockOverlay"
import { Skeleton } from "@/components/ui/skeleton"
import { CancelProModal } from "@/components/CancelProModal"
import { DeviceSyncManager } from "@/components/DeviceSyncManager"
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, getProPrice } from "@/lib/format"

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
  const sheetDragControls = useDragControls()
  const { 
    currencySymbol, 
    isPro, 
    isLoading,
    upgradeToPro, 
    cancelPro, 
    openStripePortal,
    openStripeManageDrawer,
    isSubscriptionOnly, 
    setSubscriptionOnly,
    profile,
    user,
    isPrivacyMode,
    setPrivacyMode,
    refreshProfile,
    refreshData,
    signOut,
    openFeedbackDrawer
  } = useSystem()

  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("preferences")

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
  const [aiYapLevelInput, setAiYapLevelInput] = useState<"concise" | "standard" | "verbose">("standard")
  const [halfLifeDaysInput, setHalfLifeDaysInput] = useState(15)
  const [isSaving, setIsSaving] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Rules & Habits state
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "dining", "transport"])
  const [isSeeding, setIsSeeding] = useState(false)
  const [existingRules, setExistingRules] = useState<any[]>([])
  const [newRuleKw, setNewRuleKw] = useState("")
  const [newRuleCat, setNewRuleCat] = useState("")
  const [ruleSearchQuery, setRuleSearchQuery] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [isPingingAI, setIsPingingAI] = useState(false)

  // Support Tickets State (User & Admin)
  const [userTickets, setUserTickets] = useState<any[]>([])
  const [isLoadingUserTickets, setIsLoadingUserTickets] = useState(false)
  const [adminTickets, setAdminTickets] = useState<any[]>([])
  const [adminTicketFilter, setAdminTicketFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all")
  const [isLoadingAdminTickets, setIsLoadingAdminTickets] = useState(false)
  const [selectedTicketForReply, setSelectedTicketForReply] = useState<string | null>(null)
  const [adminReplyText, setAdminReplyText] = useState("")
  const [adminReplyStatus, setAdminReplyStatus] = useState<"open" | "in_progress" | "resolved">("resolved")
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "super_user"

  const loadUserTickets = async () => {
    setIsLoadingUserTickets(true)
    try {
      const res = await fetch("/api/feedback")
      const data = await res.json()
      if (data.tickets) {
        setUserTickets(data.tickets)
      }
    } catch (e) {
      console.error("Failed to load user tickets:", e)
    } finally {
      setIsLoadingUserTickets(false)
    }
  }

  const loadAdminTickets = async () => {
    setIsLoadingAdminTickets(true)
    try {
      const res = await fetch(`/api/feedback?all=true&status=${adminTicketFilter}`)
      const data = await res.json()
      if (data.tickets) {
        setAdminTickets(data.tickets)
      }
    } catch (e) {
      console.error("Failed to load admin tickets:", e)
    } finally {
      setIsLoadingAdminTickets(false)
    }
  }

  const handleUpdateTicket = async (ticketId: string) => {
    if (!adminReplyText.trim()) {
      toast.error("Please enter a response message.")
      return
    }
    setIsSubmittingReply(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: adminReplyStatus,
          adminReply: adminReplyText.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Reply submitted and ticket status updated!")
        setSelectedTicketForReply(null)
        setAdminReplyText("")
        await loadAdminTickets()
      } else {
        toast.error(data.error || "Failed to update ticket.")
      }
    } catch (e) {
      toast.error("Failed to submit reply.")
    } finally {
      setIsSubmittingReply(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadRulesAndCategories()
      loadUserTickets()
      if (isSuperUser) {
        loadAdminTickets()
      }
    }
  }, [open, isSuperUser])

  useEffect(() => {
    if (activeTab === "account") {
      loadUserTickets()
    } else if (activeTab === "devtools" && isSuperUser) {
      loadAdminTickets()
    }
  }, [activeTab, adminTicketFilter])

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
      if (profile.ai_yap_level) setAiYapLevelInput(profile.ai_yap_level)
      if (profile.decay_weight !== undefined && profile.decay_weight !== null) {
        const days = Math.round(Math.LN2 / Math.max(0.0001, Number(profile.decay_weight)))
        setHalfLifeDaysInput(Math.min(90, Math.max(1, days)))
      }
    }
  }, [profile, open])

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

    setIsSaving(false)
    if (error) {
      toast.error("Failed to save settings")
      console.error(error)
    } else {
      toast.success("System configuration updated!")
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100000] overflow-hidden pointer-events-none">
          {/* Backdrop Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleOpenChange(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
          />

          {/* Draggable Settings Sheet Drawer */}
          <motion.div
            drag="y"
            dragListener={false}
            dragControls={sheetDragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 80 || info.velocity.y > 250) {
                handleOpenChange(false)
              }
            }}
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute pointer-events-auto bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 w-full sm:w-[620px] md:w-[720px] lg:w-[840px] h-[85vh] sm:h-[680px] max-h-[92vh] border-t border-x sm:border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl font-mono text-xs z-[100001]"
          >
            {/* Drag Handle Bar */}
            <div 
              className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing border-b border-border/40 select-none shrink-0 bg-secondary/20 hover:bg-secondary/30 transition-colors touch-none"
              onPointerDown={(e) => sheetDragControls.start(e)}
            >
              <div className="w-14 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>

            {/* Sheet Header */}
            <div 
              className="p-4 sm:p-5 border-b border-border shrink-0 space-y-1 relative cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={(e) => {
                // Only initiate drag if clicking outside buttons/inputs
                if (!(e.target as HTMLElement).closest('button, input, select, a')) {
                  sheetDragControls.start(e)
                }
              }}
            >
              <button 
                type="button"
                onClick={() => handleOpenChange(false)}
                className="absolute top-3.5 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close settings"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              <div className="flex items-center justify-between gap-3 pr-8">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2 truncate text-foreground">
                  <Sliders className="h-4 w-4 text-foreground shrink-0" />
                  <span>System Settings</span>
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground font-sans">
                Configure financial cycles, AI parameters, and system preferences.
              </p>
            </div>

            {/* Modal Tabs & Body */}
            <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 overflow-hidden">
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
                <Smartphone className="h-3.5 w-3.5" /> <span>Sync</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setPrivacyMode(!isPrivacyMode)}
                  className={cn(
                    "p-3 border cursor-pointer transition-all flex items-center justify-between gap-2 select-none",
                    isPrivacyMode ? "bg-foreground/5 border-foreground ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isPrivacyMode ? <Shield className="h-4 w-4 text-foreground shrink-0" /> : <ShieldOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="truncate">
                      <span className="font-bold uppercase text-[10px] font-mono block leading-none truncate">Privacy Mode</span>
                      <span className="text-[9px] text-muted-foreground font-mono">Hide balances</span>
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-mono uppercase px-2 py-0.5 font-bold border shrink-0", isPrivacyMode ? "bg-foreground text-background border-foreground" : "bg-secondary text-muted-foreground border-border")}>
                    {isPrivacyMode ? "ON" : "OFF"}
                  </span>
                </div>

                <div 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-3 border border-border bg-card hover:bg-secondary/20 cursor-pointer transition-all flex items-center justify-between gap-2 select-none opacity-80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {theme === "dark" ? <Moon className="h-4 w-4 text-foreground shrink-0" /> : <Sun className="h-4 w-4 text-amber-500 shrink-0" />}
                    <div className="truncate">
                      <span className="font-bold uppercase text-[10px] font-mono block leading-none truncate">Theme Mode</span>
                      <span className="text-[9px] text-muted-foreground font-mono capitalize">{theme === "dark" ? "Dark" : "Light"}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 font-bold bg-secondary text-foreground border border-border shrink-0">
                    TOGGLE
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
                    Income Cadence & Paycheck Frequency
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "monthly", title: "Monthly", subtitle: "Once a month (e.g. 25th)", isCalendar: false },
                      { id: "biweekly", title: "Bi-Weekly", subtitle: "Every 2 weeks (14d)", isCalendar: false },
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
                              setSubscriptionOnly(true)
                              setActiveTab("pro")
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
                            "p-3 border cursor-pointer transition-all space-y-1 rounded-none flex flex-col justify-between select-none relative",
                            isLocked
                              ? "bg-card/40 border-border/60 opacity-60 hover:opacity-100"
                              : isSelected
                                ? "bg-foreground/5 border-foreground shadow-sm ring-1 ring-foreground"
                                : "bg-card border-border hover:bg-secondary/20 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[10px] font-mono">{cadence.title}</span>
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                            ) : isSelected ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3] shrink-0" />
                            ) : null}
                          </div>
                          <p className="text-[9px] text-muted-foreground font-sans leading-relaxed">
                            {cadence.subtitle}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {paycheckFrequencyInput !== "calendar" && cycleMode !== "monthly" && (
                  <div className="space-y-1 bg-secondary/15 p-3 border border-border">
                    <Label htmlFor="modalPaycheckKw" className="text-[9px] uppercase font-mono font-bold text-foreground">
                      Employer / Paycheck Keyword
                    </Label>
                    <Input
                      id="modalPaycheckKw"
                      placeholder="e.g. SALARY, PAYCHECK, DIRECT DEPOSIT..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="rounded-none text-xs uppercase bg-background border-border h-9 font-bold"
                    />
                    <span className="text-[8px] text-muted-foreground block font-sans">
                      Deposits with this keyword will trigger your {paycheckFrequencyInput} payroll cycle.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
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
                {/* 1. Provider & Credentials Card */}
                <div className="p-4 bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-mono text-foreground font-bold flex items-center gap-1.5">
                        <Brain className="h-4 w-4 text-emerald-500" /> AI Provider & Credentials
                      </span>
                      <span className="text-[10px] text-muted-foreground font-sans block mt-0.5">
                        Choose your primary inference engine or connect a custom API key.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="modalAiProvider" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                        AI Provider Engine
                      </Label>
                      <div className="relative">
                        <select
                          id="modalAiProvider"
                          value={aiProviderInput}
                          onChange={(e) => setAiProviderInput(e.target.value)}
                          className="w-full bg-background border border-border rounded-none h-9 px-3 pr-8 text-xs font-mono text-foreground outline-none focus:border-foreground appearance-none font-bold"
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
                        className="rounded-none font-mono text-xs h-9 bg-background font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Response Calibration & Decay Parameters */}
                <div className="p-4 bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-mono text-foreground font-bold flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-foreground" /> Intelligence Calibration
                      </span>
                      <span className="text-[10px] text-muted-foreground font-sans block mt-0.5">
                        Tune response verbosity and recency-decay mathematical weighting (λ).
                      </span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="p-4 bg-secondary/15 border border-border space-y-3">
                      <Skeleton className="h-4 w-44 rounded-none" />
                      <Skeleton className="h-8 w-full rounded-none" />
                    </div>
                  ) : !isPro ? (
                    <ProLockOverlay 
                      compact
                      title="ADVANCED AI CALIBRATION (PRO)"
                      description="Custom AI response depth and mathematical recency-decay half-life parameters are exclusive to LEGER_OS PRO nodes."
                    />
                  ) : (
                    <div className="space-y-4 pt-1">
                      {/* AI Response Depth */}
                      <div className="space-y-1.5">
                        <Label htmlFor="modalYapLevel" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                          AI Response Depth
                        </Label>
                        <div className="relative">
                          <select
                            id="modalYapLevel"
                            value={aiYapLevelInput}
                            onChange={(e) => setAiYapLevelInput(e.target.value as any)}
                            className="w-full bg-background border border-border rounded-none h-9 px-3 pr-8 text-xs font-mono outline-none appearance-none text-foreground focus:border-foreground font-bold"
                          >
                            <option value="concise">Concise & Direct (Brief)</option>
                            <option value="standard">Standard (Balanced context)</option>
                            <option value="verbose">Detailed & Explanatory (Deep)</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      {/* Recency Half-Life Calibration (Mobile-Optimized Fast-Tap Presets + Stepper, No Sliders) */}
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                            Projection Half-Life Window
                          </Label>
                          <span className="text-[10px] font-mono font-bold text-emerald-500">
                            {halfLifeDaysInput} Days {halfLifeDaysInput === 15 ? "(Default)" : ""}
                          </span>
                        </div>

                        {/* Fast-Tap Preset Buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { days: 7, label: "7d · Agile" },
                            { days: 15, label: "15d · Standard" },
                            { days: 30, label: "30d · Macro" }
                          ].map((preset) => (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() => setHalfLifeDaysInput(preset.days)}
                              className={`py-1.5 px-2 text-[10px] font-mono border text-center transition-all cursor-pointer ${
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
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setHalfLifeDaysInput(prev => Math.max(1, prev - 1))}
                            className="h-9 w-10 bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-foreground font-bold font-mono text-sm active:scale-95 transition-transform cursor-pointer"
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
                              className="w-full h-9 bg-background border border-border text-center font-mono font-bold text-xs text-foreground px-2 focus:border-foreground outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground pointer-events-none">
                              days
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHalfLifeDaysInput(prev => Math.min(90, prev + 1))}
                            className="h-9 w-10 bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-foreground font-bold font-mono text-sm active:scale-95 transition-transform cursor-pointer"
                            aria-label="Increase days"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-[10px] text-muted-foreground font-sans leading-tight">
                          Expenses within the last {halfLifeDaysInput} days carry &ge;50% statistical weight in cash flow predictions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-9 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[10px] font-bold tracking-widest cursor-pointer"
                >
                  {isSaving ? "SAVING..." : "SAVE AI ENGINE CONFIGURATION"}
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

            {/* TAB 4: DEVICE NOTIFICATION & PUSH SYNC */}
            <TabsContent value="phone" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              <DeviceSyncManager 
                user={user} 
                isPro={isPro} 
                isLoading={isLoading}
                onUpgradeClick={() => {
                  setActiveTab("pro")
                }} 
              />
            </TabsContent>

            {/* TAB 5: PRO PLAN */}
            <TabsContent value="pro" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              {/* HIGH CONVERSION PRO HERO CARD */}
              <div className="p-5 bg-card border-2 border-emerald-500/50 space-y-4 relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.12)]">
                <div className="absolute top-0 right-0 bg-emerald-500 text-black font-mono font-bold text-[8px] px-2.5 py-1 uppercase tracking-widest">
                  RECOMMENDED
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground font-mono">
                      <Sparkles className="h-4 w-4 text-emerald-500" /> LEGER_OS PRO
                    </h4>
                    <p className="text-[10px] text-emerald-500 font-mono font-medium">Autonomous Financial Mainframe</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-2xl font-bold font-mono text-foreground">{getProPrice(currencyInput).formatted}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase">Instant Activation • Cancel Anytime</p>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  Unlock autonomous bank push synchronization, AI neural transaction categorization, and precision recency-decay predictive cash flow simulations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[10px] font-mono">
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 border border-border/40">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-bold">Android Push Notification Sync</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 border border-border/40">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-bold">AI Neural Ingestion & Categorization</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 border border-border/40">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-bold">Recency-Decay (λ) Forecasting</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 border border-border/40">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-bold">Conversational AI Overrides</span>
                  </div>
                </div>

                {isPro ? (
                  <Button 
                    type="button"
                    onClick={openStripeManageDrawer}
                    className="w-full rounded-none font-mono text-xs uppercase font-bold h-10 bg-card border border-border text-foreground hover:bg-secondary/40 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                    Manage Payment Methods & Invoices
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={upgradeToPro}
                    className="w-full rounded-none font-mono text-xs uppercase font-bold h-10 bg-emerald-500 text-black hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
                  >
                    Upgrade to PRO ({getProPrice(currencyInput).formatted}/mo)
                  </Button>
                )}
              </div>

              {/* CORE FREE BASE PLAN */}
              <div className="p-3 bg-card/40 border border-border/40 opacity-70 space-y-2 select-none">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider font-mono">LEGER_OS CORE</h5>
                    <p className="text-[8px] text-muted-foreground/80 font-mono">Manual tracking • Standard base</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{currencySymbol}0/mo</span>
                </div>
                <Button 
                  type="button"
                  disabled={!isPro} 
                  variant="ghost" 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full rounded-none font-mono text-[8px] uppercase h-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                >
                  {!isPro ? "Current Active Base Plan" : "Cancel PRO Subscription"}
                </Button>
              </div>

              {/* HIGH-FRICTION RETENTION CANCEL MODAL */}
              <CancelProModal 
                isOpen={isCancelModalOpen} 
                onClose={() => setIsCancelModalOpen(false)} 
              />
            </TabsContent>

            {/* TAB 6: ACCOUNT & SECURITY */}
            <TabsContent value="account" className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              {/* DATA PORTABILITY & VAULT BACKUP */}
              <div className="p-4 bg-card border border-border space-y-3 font-mono">
                <div className="border-b border-border/40 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5 font-mono">
                      <Database className="h-3.5 w-3.5 text-foreground" /> Data Portability & Vault Backup
                    </span>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Export full offline JSON snapshots or spreadsheet-ready CSV ledgers.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleExport("json", "vault")}
                    disabled={isExporting}
                    className="w-full rounded-none h-9 text-[10px] uppercase font-mono font-bold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Full Vault Snapshot (.JSON)
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={() => handleExport("csv", "transactions")}
                      disabled={isExporting}
                      variant="outline"
                      className="rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-secondary/30 hover:bg-secondary/70 border-border text-foreground cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="h-3 w-3 text-muted-foreground" /> Ledger (.CSV)
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleExport("csv", "portfolio")}
                      disabled={isExporting}
                      variant="outline"
                      className="rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-secondary/30 hover:bg-secondary/70 border-border text-foreground cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="h-3 w-3 text-muted-foreground" /> Portfolio (.CSV)
                    </Button>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Restore from Backup</span>
                    <span className="text-[8px] text-muted-foreground font-sans">Safe deduplication</span>
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
                    className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-card border-dashed border-border hover:bg-secondary/40 text-foreground cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="h-3 w-3 text-muted-foreground" /> 
                    {isRestoring ? "Restoring Vault Data..." : "Choose .JSON Vault Backup"}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-foreground" /> Direct Support & Feedback
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                      Report bank parsing anomalies, layout bugs, or request integrations.
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    handleOpenChange(false)
                    openFeedbackDrawer("general")
                  }}
                  variant="outline"
                  className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold bg-secondary/30 hover:bg-foreground hover:text-background border-border cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-3 w-3" /> Transmit Anomaly or Feedback Report
                </Button>
              </div>

              {/* USER TICKETS & STATUS INBOX */}
              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-foreground" /> Your Support Tickets & Feedback
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                      Track the resolution status and direct responses from the engineering team.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={loadUserTickets}
                    disabled={isLoadingUserTickets}
                    className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1", isLoadingUserTickets && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {isLoadingUserTickets ? (
                  <div className="py-6 text-center text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading ticket status...
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="py-4 px-3 border border-border/60 bg-secondary/10 text-center space-y-1">
                    <span className="font-mono text-[11px] font-bold uppercase text-foreground block">No Active Tickets</span>
                    <p className="font-mono text-[10px] text-muted-foreground">You haven't submitted any bug reports or feedback tickets yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {userTickets.map((ticket) => {
                      const isResolved = ticket.status === "resolved"
                      const isInProgress = ticket.status === "in_progress"
                      return (
                        <div key={ticket.id} className="p-3 border border-border bg-secondary/15 space-y-2 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase border bg-card border-border text-foreground">
                              {ticket.category || "GENERAL"}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 text-[9px] font-bold uppercase border flex items-center gap-1",
                              isResolved && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                              isInProgress && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                              !isResolved && !isInProgress && "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            )}>
                              {isResolved ? <CheckCircle2 className="h-2.5 w-2.5" /> : isInProgress ? <Clock className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                              {ticket.status?.toUpperCase().replace("_", " ") || "OPEN"}
                            </span>
                          </div>

                          <p className="text-[11px] text-foreground/90 font-sans leading-relaxed">
                            {ticket.message}
                          </p>

                          {ticket.admin_reply ? (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 space-y-1 mt-2">
                              <div className="flex items-center justify-between text-[9px] font-mono font-bold text-emerald-500 uppercase">
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Response from Engineering</span>
                                <span>{ticket.replied_at ? new Date(ticket.replied_at).toLocaleDateString() : "Just now"}</span>
                              </div>
                              <p className="text-[11px] text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                                {ticket.admin_reply}
                              </p>
                            </div>
                          ) : (
                            <div className="text-[9px] text-muted-foreground flex items-center gap-1 pt-1">
                              <Clock className="h-2.5 w-2.5" /> Awaiting review by engineering team
                            </div>
                          )}

                          <div className="text-[8px] text-muted-foreground/60 text-right">
                            {new Date(ticket.created_at).toLocaleString()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-card border border-border space-y-3">
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-foreground block">Session Node</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate block">{user?.email || "USER"}</span>
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
                  <Trash2 className="h-3.5 w-3.5" /> Delete Account & Purge Data
                </div>
                <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                  Permanently delete your account, transactions, budgets, and all saved preferences.
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
                      <span className="font-bold text-foreground">{profile?.role ? profile.role.toUpperCase().replace("_", " ") : "Super User"}</span>
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

                {/* ADMIN FEEDBACK & SUPPORT TICKETS HUB */}
                <div className="p-4 bg-card border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> Admin Support & Feedback Hub
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                        Review incoming user tickets, send responses, and resolve anomalies.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={loadAdminTickets}
                      disabled={isLoadingAdminTickets}
                      className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", isLoadingAdminTickets && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 border-b border-border pb-2 text-[10px] font-mono">
                    {(["all", "open", "in_progress", "resolved"] as const).map((filterVal) => (
                      <button
                        key={filterVal}
                        type="button"
                        onClick={() => setAdminTicketFilter(filterVal)}
                        className={cn(
                          "px-2.5 py-1 uppercase font-bold transition-colors cursor-pointer",
                          adminTicketFilter === filterVal
                            ? "bg-foreground text-background"
                            : "bg-secondary/20 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {filterVal.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {isLoadingAdminTickets ? (
                    <div className="py-8 text-center text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading all user tickets...
                    </div>
                  ) : adminTickets.length === 0 ? (
                    <div className="py-6 px-3 border border-border/60 bg-secondary/10 text-center space-y-1">
                      <span className="font-mono text-[11px] font-bold uppercase text-foreground block">No Tickets in this Filter</span>
                      <p className="font-mono text-[10px] text-muted-foreground">All tickets are resolved or no matching reports found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {adminTickets.map((ticket) => {
                        const isResolved = ticket.status === "resolved"
                        const isInProgress = ticket.status === "in_progress"
                        const isReplying = selectedTicketForReply === ticket.id

                        return (
                          <div key={ticket.id} className="p-3.5 border border-border bg-secondary/15 space-y-3 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase border bg-card border-border text-foreground">
                                  {ticket.category || "GENERAL"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                                  {ticket.user_email || "Anonymous"}
                                </span>
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 text-[9px] font-bold uppercase border flex items-center gap-1",
                                isResolved && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                                isInProgress && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                                !isResolved && !isInProgress && "bg-amber-500/10 text-amber-500 border-amber-500/30"
                              )}>
                                {ticket.status?.toUpperCase().replace("_", " ") || "OPEN"}
                              </span>
                            </div>

                            <p className="text-[11px] text-foreground/90 font-sans leading-relaxed bg-card/60 p-2.5 border border-border/40">
                              {ticket.message}
                            </p>

                            {ticket.admin_reply && (
                              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                                <div className="flex items-center justify-between text-[9px] font-bold text-emerald-500 uppercase">
                                  <span>Admin Response:</span>
                                  <span>{ticket.replied_at ? new Date(ticket.replied_at).toLocaleString() : ""}</span>
                                </div>
                                <p className="text-[11px] text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                                  {ticket.admin_reply}
                                </p>
                              </div>
                            )}

                            {isReplying ? (
                              <div className="space-y-2.5 pt-2 border-t border-border">
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground">Admin Response:</label>
                                  <textarea
                                    value={adminReplyText}
                                    onChange={(e) => setAdminReplyText(e.target.value)}
                                    placeholder="Type response to user (e.g. 'Issue fixed in latest release, thank you!')..."
                                    className="w-full h-20 p-2 text-xs bg-background border border-border rounded-none font-sans text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground resize-none"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Set Status:</span>
                                    <select
                                      value={adminReplyStatus}
                                      onChange={(e) => setAdminReplyStatus(e.target.value as any)}
                                      className="h-7 px-2 text-[10px] bg-background border border-border rounded-none text-foreground font-mono uppercase cursor-pointer"
                                    >
                                      <option value="resolved">Resolved</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="open">Open</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedTicketForReply(null)}
                                      className="h-7 px-2.5 text-[10px] font-mono cursor-pointer"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleUpdateTicket(ticket.id)}
                                      disabled={isSubmittingReply}
                                      className="h-7 px-3 text-[10px] font-mono font-bold uppercase bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center gap-1"
                                    >
                                      <Send className="h-3 w-3" /> {isSubmittingReply ? "Sending..." : "Submit Reply"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[8px] text-muted-foreground/60">
                                  {new Date(ticket.created_at).toLocaleString()}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTicketForReply(ticket.id)
                                    setAdminReplyText(ticket.admin_reply || "")
                                    setAdminReplyStatus(ticket.status === "open" ? "resolved" : ticket.status)
                                  }}
                                  className="h-6 px-2 text-[9px] font-mono uppercase font-bold bg-secondary/30 hover:bg-foreground hover:text-background border-border cursor-pointer"
                                >
                                  {ticket.admin_reply ? "Edit Reply / Status" : "Reply to User"}
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
