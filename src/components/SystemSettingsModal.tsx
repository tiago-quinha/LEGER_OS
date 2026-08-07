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
import { Sparkles, Check, X, Sliders, Brain, Smartphone, Shield, ShieldOff, Sun, Moon, LogOut, ShieldAlert, Copy, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from "@/lib/format"

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
  const [activeTab, setActiveTab] = useState<string>("preferences")

  // Controlled form states
  const [currencyInput, setCurrencyInput] = useState("EUR")
  const [languageInput, setLanguageInput] = useState("en-US")
  const [aiProviderInput, setAiProviderInput] = useState("gemini")
  const [customKeyInput, setCustomKeyInput] = useState("")
  const [aiYapLevelInput, setAiYapLevelInput] = useState<"concise" | "standard" | "verbose">("standard")
  const [decayInput, setDecayInput] = useState("0.12")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isSubscriptionOnly) {
      setActiveTab("pro")
    } else {
      setActiveTab("preferences")
    }
  }, [isSubscriptionOnly, open])

  useEffect(() => {
    if (profile) {
      if (profile.currency) setCurrencyInput(profile.currency)
      if (profile.language) setLanguageInput(profile.language)
      if (profile.ai_provider) setAiProviderInput(profile.ai_provider)
      if (profile.custom_api_key) setCustomKeyInput(profile.custom_api_key)
      if (profile.ai_yap_level) setAiYapLevelInput(profile.ai_yap_level)
      if (profile.decay_weight !== undefined) setDecayInput(profile.decay_weight.toString())
    }
  }, [profile])

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

    const { error } = await supabase
      .from("profiles")
      .update({
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border border-border rounded-none p-4 sm:p-6 font-mono text-xs w-[96vw] sm:max-w-2xl md:max-w-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border pb-4 pr-8 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2 truncate text-foreground">
              <Sliders className="h-4 w-4 text-foreground" />
              <span>System Settings & Preferences</span>
            </DialogTitle>
            <GlowingBadge variant={isPro ? "success" : "neutral"} pulse={isPro} dot={true} className="text-[9px] shrink-0">
              {isPro ? "PRO_ACTIVE" : "CORE_FREE"}
            </GlowingBadge>
          </div>
          <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Calibrate localization, AI providers, automation endpoints, and subscription tier.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Tabs & Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <TabsList className="bg-secondary/40 border border-border rounded-none p-1 !h-auto w-full grid grid-cols-2 sm:grid-cols-5 gap-1">
              <TabsTrigger value="preferences" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5">
                <Brain className="h-3.5 w-3.5" /> <span>AI Engine</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> <span>Phone Sync</span>
              </TabsTrigger>
              <TabsTrigger value="pro" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Sparkles className="h-3.5 w-3.5" /> <span>PRO Plan</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="rounded-none h-9 px-2 text-[10px] uppercase tracking-wider font-mono font-bold flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
                <Shield className="h-3.5 w-3.5" /> <span>Account</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GENERAL PREFERENCES */}
            <TabsContent value="preferences" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-card border border-border space-y-2">
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
                    Obfuscates currency values and balance numbers across views.
                  </p>
                  <Button 
                    type="button"
                    variant={isPrivacyMode ? "default" : "outline"} 
                    onClick={() => setPrivacyMode(!isPrivacyMode)}
                    className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold mt-1 cursor-pointer"
                  >
                    {isPrivacyMode ? "Disable Safe-Deposit" : "Enable Safe-Deposit"}
                  </Button>
                </div>

                <div className="p-3.5 bg-card border border-border space-y-2">
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
                    Toggle visual terminal presentation theme.
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full rounded-none h-8 text-[9px] uppercase font-mono font-bold mt-1 cursor-pointer"
                  >
                    Switch to {theme === "dark" ? "Mainframe Light" : "Cybermatic Dark"}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="modalCurrency" className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
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

                  <div className="space-y-1.5">
                    <Label htmlFor="modalLanguage" className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
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

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-9 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[10px] font-bold tracking-widest cursor-pointer"
                >
                  {isSaving ? "SAVING PREFERENCES..." : "SAVE GENERAL PREFERENCES"}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 2: AI ENGINE CONFIG */}
            <TabsContent value="ai" className="space-y-4">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="p-4 bg-secondary/10 border border-border space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider font-mono text-foreground font-bold block">
                      Neural Provider & Key Setup
                    </span>
                    <span className="text-[10px] text-muted-foreground font-sans block">
                      Select your preferred provider or supply a custom API key for unthrottled context.
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
                      <Label htmlFor="modalCustomKey" className="text-[9px] uppercase font-mono font-bold text-muted-foreground">
                        Custom API Key / Endpoint
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
                    {!isPro && (
                      <span className="text-[9px] font-sans text-muted-foreground block">
                        * Upgrade to PRO to unlock custom AI response verbosity settings.
                      </span>
                    )}
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
                    {!isPro && (
                      <span className="text-[9px] font-sans text-muted-foreground block">
                        * Exponential time-decay trajectory forecasting is unlocked on PRO tier.
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-9 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-[10px] font-bold tracking-widest cursor-pointer"
                >
                  {isSaving ? "SAVING AI ENGINE..." : "SAVE AI & DECAY CALIBRATION"}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 3: PHONE SYNC */}
            <TabsContent value="phone" className="space-y-4">
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
                      <div className="font-mono text-[10px] font-bold text-amber-500 uppercase">
                        🔒 ENDPOINT LOCKED ON CORE FREE TIER
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

            {/* TAB 4: PRO PLAN */}
            <TabsContent value="pro" className="space-y-4">
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

            {/* TAB 5: ACCOUNT & SECURITY */}
            <TabsContent value="account" className="space-y-4">
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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
