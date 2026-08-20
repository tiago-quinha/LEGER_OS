"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Landmark, Upload, Terminal, Sparkles, ArrowRight, Calendar, Check, Sliders, Smartphone, ShieldCheck, Copy, Apple, Globe, Building2, Zap, CreditCard, Search, Building, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getProPrice, formatCurrency } from "@/lib/format"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { PRESET_BANK_APPS } from "@/lib/banking-apps-registry"

const HABIT_PRESETS = [
  { id: "groceries", name: "Supermarkets & Groceries", desc: "Walmart, Aldi, Carrefour, Costco", category: "Food", keywords: ["Walmart", "Aldi", "Carrefour", "Costco", "Tesco", "Lidl"] },
  { id: "dining", name: "Dining & Food Delivery", desc: "Uber Eats, DoorDash, McDonald's, Starbucks", category: "Food", keywords: ["Uber Eats", "DoorDash", "McDonalds", "Starbucks", "Burger King"] },
  { id: "transport", name: "Rideshare & Transit", desc: "Uber, Lyft, Metro, Public Transit", category: "Transport", keywords: ["Uber", "Lyft", "Metro", "Transit", "Train"] },
  { id: "fuel", name: "Gas Stations", desc: "Shell, BP, Exxon, Chevron", category: "Gas", keywords: ["Shell", "BP", "Exxon", "Chevron", "Total"] },
  { id: "housing", name: "Utilities & Telecom", desc: "AT&T, Vodafone, Electricity, Internet", category: "Housing", keywords: ["AT&T", "Vodafone", "Electric", "Water", "Internet"] },
  { id: "entertainment", name: "Subscriptions & Gaming", desc: "Netflix, Spotify, Steam, Prime Video", category: "Entertainment", keywords: ["Netflix", "Spotify", "Steam", "Prime", "Apple"] },
]

const ONBOARDING_BANK_APPS = [
  { id: "revolut", name: "Revolut", type: "Digital / Multi-Currency", domain: "revolut.com" },
  { id: "santander", name: "Santander", type: "Global Banking", domain: "santander.pt" },
  { id: "chase", name: "Chase Bank", type: "US / Global", domain: "chase.com" },
  { id: "mbway", name: "MB WAY", type: "Instant Mobile", domain: "www.mbway.pt" },
  { id: "n26", name: "N26", type: "Digital Bank", domain: "n26.com" },
  { id: "wise", name: "Wise", type: "Multi-Currency / FX", domain: "wise.com" },
  { id: "apple_pay", name: "Apple Wallet / Pay", type: "Universal Cards", domain: "apple.com", isApple: true },
  { id: "amex", name: "American Express", type: "Credit / Global", domain: "americanexpress.com" },
  { id: "cgd", name: "Caixa Geral", type: "Portugal / EU", domain: "cgd.pt" },
  { id: "millennium", name: "Millennium bcp", type: "Portugal / EU", domain: "millenniumbcp.pt" },
  { id: "monzo", name: "Monzo", type: "UK / Digital", domain: "monzo.com" },
  { id: "nubank", name: "Nubank", type: "LATAM / Digital", domain: "nubank.com.br" },
  { id: "bofa", name: "Bank of America", type: "US / Consumer", domain: "bankofamerica.com" },
  { id: "activobank", name: "ActivoBank", type: "Digital / Portugal", domain: "activobank.pt" },
  { id: "novobanco", name: "Novo Banco", type: "Portugal / EU", domain: "novobanco.pt" },
  { id: "bbva", name: "BBVA", type: "Spain / LATAM", domain: "bbva.es" },
]

function BankIconBadge({ domain, name, isApple }: { domain?: string; name: string; isApple?: boolean }) {
  const [hasError, setHasError] = useState(false)
  if (isApple) {
    return (
      <div className="h-8 w-8 rounded-lg bg-secondary/50 border border-border shrink-0 flex items-center justify-center p-1 text-foreground shadow-sm">
        <Apple className="h-4 w-4" />
      </div>
    )
  }
  if (domain && !hasError) {
    return (
      <div className="h-8 w-8 rounded-lg bg-secondary/40 border border-border shrink-0 flex items-center justify-center p-1 overflow-hidden shadow-xs relative">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={name}
          loading="eager"
          className="h-full w-full object-contain rounded-xs"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }
  return (
    <div className="h-8 w-8 rounded-lg bg-secondary/50 border border-border shrink-0 flex items-center justify-center font-mono text-[10px] font-bold uppercase text-foreground shadow-xs">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function OnboardingView() {
  const router = useRouter()
  const { user, refreshData, currencySymbol, isPro, profile, refreshProfile, claimProDiscount, currency } = useSystem()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [yapLevel, setYapLevel] = useState<"concise" | "standard" | "verbose">("standard")
  const [deviceOs, setDeviceOs] = useState<"ios" | "android">("ios")
  const [step4SubStage, setStep4SubStage] = useState<"apps" | "device">("apps")
  const [iosStage, setIosStage] = useState<0 | 1>(0)
  const [showProOffer, setShowProOffer] = useState(false)
  const [selectedBankApps, setSelectedBankApps] = useState<string[]>(["revolut", "santander", "chase", "mbway", "n26", "wise", "apple_pay"])
  const [installedApps, setInstalledApps] = useState<{ name: string; packageName: string; isFinance: boolean }[]>([])
  const [isLoadingNativeApps, setIsLoadingNativeApps] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === "android")
    }
    return false
  })
  const [appScopeTab, setAppScopeTab] = useState<"finance" | "all">("finance")
  const [searchQuery, setSearchQuery] = useState("")

  // Scan real installed apps on Android device via Capacitor LegerBankSync
  useEffect(() => {
    if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
      const BankSync = registerPlugin<any>("LegerBankSync")
      if (BankSync) {
        setIsLoadingNativeApps(true)
        BankSync.getInstalledApps().then((res: any) => {
          if (res?.apps && Array.isArray(res.apps)) {
            const sorted = [...res.apps].sort((a, b) => {
              if (a.isFinance && !b.isFinance) return -1
              if (!a.isFinance && b.isFinance) return 1
              return a.name.localeCompare(b.name)
            })
            setInstalledApps(sorted)
          }
        }).catch((err: any) => {
          console.error("Failed to load native apps in onboarding:", err)
        }).finally(() => {
          setIsLoadingNativeApps(false)
        })

        BankSync.getSelectedBankPackages().then((res: any) => {
          if (res?.packages && Array.isArray(res.packages) && res.packages.length > 0) {
            setSelectedBankApps(res.packages)
          }
        }).catch(() => {})
      }
    }
  }, [])

  const displayBanks = useMemo(() => {
    if (installedApps.length > 0) {
      let list = appScopeTab === "finance" 
        ? installedApps.filter(app => app.isFinance)
        : installedApps

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        list = list.filter(app => app.name.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q))
      }

      return list.map(app => {
        const matchingPreset = PRESET_BANK_APPS.find(p => p.package === app.packageName || p.name.toLowerCase() === app.name.toLowerCase())
        return {
          id: app.packageName,
          name: app.name,
          package: app.packageName,
          type: app.isFinance ? "Finance / Bank" : "Device App",
          domain: matchingPreset?.domain || "app",
          isFinance: app.isFinance
        }
      })
    }

    let list = [...PRESET_BANK_APPS]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(app => app.name.toLowerCase().includes(q) || app.package.toLowerCase().includes(q))
    }
    return list.map(b => ({
      id: b.id,
      name: b.name,
      package: b.package,
      type: b.region,
      domain: b.domain,
      isFinance: true
    }))
  }, [installedApps, appScopeTab, searchQuery])

  const toggleBankSelection = (id: string, pkg?: string) => {
    const targetKey = pkg || id
    const newSel = selectedBankApps.includes(targetKey)
      ? selectedBankApps.filter(item => item !== targetKey)
      : [...selectedBankApps, targetKey]
    setSelectedBankApps(newSel)
    if (typeof window !== "undefined") {
      localStorage.setItem(`leger_monitored_banks_${user?.id || "default"}`, JSON.stringify(newSel))
    }
    if (Capacitor.isNativePlatform()) {
      const BankSync = registerPlugin<any>("LegerBankSync")
      BankSync?.setSelectedBankPackages({ packages: newSel }).catch(() => {})
    }
  }

  // Pricing calculations for €2.50 / 50% introductory rate
  const decimals = currency === "JPY" ? 0 : 2
  const proPriceObj = getProPrice(currency)
  const fullAmount = parseFloat(proPriceObj.amount)
  const halfAmount = fullAmount / 2
  const fullPriceFormatted = formatCurrency(fullAmount, currency, decimals)
  const halfPriceFormatted = formatCurrency(halfAmount, currency, decimals)

  const handleProceedFromStep4 = async () => {
    if (isPro) {
      toast.success("Device Push Ingestion Initialized")
      await handleCompleteOnboarding('/')
    } else {
      setShowProOffer(true)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || ""
      if (/iPhone|iPad|iPod|Macintosh/i.test(ua)) {
        setDeviceOs("ios")
      } else if (/Android/i.test(ua)) {
        setDeviceOs("android")
      }
    }
  }, [])

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://leger-os.vercel.app'
  const productionEndpoint = `${baseUrl}/api/transactions/device-push?userId=${user?.id || ""}`

  useEffect(() => {
    if (profile?.ai_yap_level) {
      setYapLevel(profile.ai_yap_level)
    }
  }, [profile])

  // Step 1: Paycheck Keyword & Target Curves
  const [cycleMode, setCycleMode] = useState<"keyword" | "monthly">("keyword")
  const [paycheckFrequency, setPaycheckFrequency] = useState<"monthly" | "biweekly" | "weekly" | "calendar">("monthly")
  const [keyword, setKeyword] = useState("")
  const [targetIncome, setTargetIncome] = useState("")
  const [targetSpend, setTargetSpend] = useState("")

  // Step 2: Habits
  const [selectedHabits, setSelectedHabits] = useState<string[]>(["groceries", "transport", "housing"])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const getUserId = async () => {
    if (user?.id) return user.id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    return authUser?.id
  }

  const handleCompleteOnboarding = async (targetUrl: string) => {
    const targetId = await getUserId()
    if (targetId) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", targetId)
    }
    window.location.href = targetUrl
  }

  const handleCompleteStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
    // Save in background immediately without blocking UI
    getUserId().then((targetId) => {
      if (!targetId) return
      const isCal = cycleMode === "monthly" || paycheckFrequency === "calendar"
      const finalKw = isCal ? "MONTHLY" : (keyword.trim() || "SALARY")
      supabase.from("profiles").update({ 
        paycheck_keyword: finalKw,
        paycheck_frequency: isCal ? "calendar" : paycheckFrequency,
        target_monthly_income: parseFloat(targetIncome) || 2500,
        target_monthly_spend: parseFloat(targetSpend) || 1500,
        onboarding_completed: true 
      }).eq("id", targetId)
    })
  }

  const toggleHabit = (id: string) => {
    if (selectedHabits.includes(id)) {
      setSelectedHabits(selectedHabits.filter(h => h !== id))
    } else {
      setSelectedHabits([...selectedHabits, id])
    }
  }

  const handleSeedAndProceed = () => {
    setStep(3)
    // Seed rules in background immediately without blocking UI
    getUserId().then((targetId) => {
      if (selectedHabits.length > 0 && categories.length > 0) {
        for (const habitId of selectedHabits) {
          const habit = HABIT_PRESETS.find(h => h.id === habitId)
          if (habit) {
            const matchedCategory = categories.find(c => c.name.toLowerCase().includes(habit.category.toLowerCase())) || categories[0]
            if (matchedCategory) {
              for (const kw of habit.keywords) {
                supabase.from("rules").insert({
                  keyword: kw,
                  category_id: matchedCategory.id,
                  user_id: targetId || undefined
                })
              }
            }
          }
        }
        if (targetId) {
          supabase.from("profiles").update({ onboarding_completed: true }).eq("id", targetId)
        }
      }
    })
  }

  const handleCompleteStep3 = () => {
    setStep(4)
    // Save AI configuration in background immediately without blocking UI
    getUserId().then((targetId) => {
      if (targetId) {
        supabase.from("profiles").update({ 
          ai_yap_level: yapLevel,
          onboarding_completed: true
        }).eq("id", targetId).then(() => {
          refreshProfile()
        })
      }
    })
  }

  return (
    <div className="min-h-dvh flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-xl mx-auto overflow-y-auto overflow-x-hidden select-none">
      {/* Top Intentional Header - Expands dynamically to fill available vertical space */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-8 py-4 sm:py-6 min-h-[240px]">
        <motion.div 
          initial={{ rotate: 0, scale: 0.9 }}
          animate={{ rotate: 45, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-foreground flex items-center justify-center ledger-border shadow-2xl"
        >
          <Landmark className="h-8 w-8 sm:h-10 sm:w-10 text-background -rotate-45" />
        </motion.div>
        
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none text-foreground">
            INITIALIZE LEGER_OS
          </h1>
          <p className="text-muted-foreground font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] opacity-80">
            {step === 1 && "Step 01 — Paycheck Cycle Architecture"}
            {step === 2 && "Step 02 — Category Habit Rules"}
            {step === 3 && "Step 03 — AI Intelligence Calibration"}
            {step === 4 && "Step 04 — Device Synchronization"}
          </p>
        </div>

        {/* Glowing Progress Status Lights */}
        <div className="flex items-center gap-2 pt-4 sm:pt-6">
          {[1, 2, 3, 4].map((s) => {
            const isActive = step === s
            const isCompleted = step > s
            return (
              <div 
                key={s} 
                className={cn(
                  "h-1.5 w-12 sm:w-16 transition-all duration-300", 
                  isActive 
                    ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" 
                    : isCompleted 
                      ? "bg-foreground" 
                      : "bg-muted/60"
                )} 
              />
            )
          })}
        </div>
      </div>

      {/* Bottom Anchored Menu Card - Clean, docked thumb reach */}
      <div className="w-full shrink-0 pb-1 sm:pb-2 mt-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full bg-card border border-border p-5 sm:p-6 md:p-7 space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4" /> Define Your Income Pattern
                </h3>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  LEGER_OS organizes budgets around financial cycles rather than arbitrary dates. Select how your primary cycle resets:
                </p>
              </div>

              {/* 4-Option Income Cadence Architecture */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                {[
                  { id: "monthly", title: "Monthly", subtitle: "Once a month (e.g. 25th)", isCalendar: false },
                  { id: "biweekly", title: "Bi-Weekly", subtitle: "Every 2 weeks (14 days)", isCalendar: false },
                  { id: "weekly", title: "Weekly", subtitle: "Every 7 days (e.g. Fridays)", isCalendar: false },
                  { id: "calendar", title: "Calendar Month", subtitle: "1st to 30th / 31st", isCalendar: true }
                ].map((cadence) => {
                  const isSelected = cadence.id === "calendar" 
                    ? cycleMode === "monthly" || paycheckFrequency === "calendar"
                    : cycleMode === "keyword" && paycheckFrequency === cadence.id

                  return (
                    <div
                      key={cadence.id}
                      onClick={() => {
                        if (cadence.isCalendar) {
                          setCycleMode("monthly")
                          setPaycheckFrequency("calendar")
                        } else {
                          setCycleMode("keyword")
                          setPaycheckFrequency(cadence.id as any)
                        }
                      }}
                      className={cn(
                        "p-3 border cursor-pointer transition-all flex flex-col justify-between select-none relative",
                        isSelected ? "bg-foreground/10 border-foreground shadow-sm" : "bg-background border-border opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold uppercase">{cadence.title}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3] shrink-0" />}
                      </div>
                      <p className="text-[9px] text-muted-foreground font-sans mt-1">
                        {cadence.subtitle}
                      </p>
                    </div>
                  )
                })}
              </div>

              <form onSubmit={handleCompleteStep1} className="space-y-3.5 pt-0.5">
                {paycheckFrequency !== "calendar" && cycleMode !== "monthly" && (
                  <div className="space-y-1">
                    <Label htmlFor="paycheck" className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                      Employer / Deposit Keyword
                    </Label>
                    <Input
                      id="paycheck"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g. DELOITTE, SALARY, EMPLOYER..."
                      className="rounded-none font-mono text-xs uppercase h-10 bg-background"
                    />
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground block font-sans">
                      Deposits matching this keyword will automatically start and track your {paycheckFrequency} cycle.
                    </span>
                  </div>
                )}

                {/* Side-by-side Target Inputs */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="targetIncome" className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold truncate block">
                        Expected Income ({currencySymbol})
                      </Label>
                      <Input
                        id="targetIncome"
                        type="number"
                        value={targetIncome}
                        onChange={(e) => setTargetIncome(e.target.value)}
                        placeholder="2500"
                        className="rounded-none font-mono text-xs h-10 bg-background text-emerald-500 placeholder:text-emerald-500/60 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="targetSpend" className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold truncate block">
                        Spending Ceiling ({currencySymbol})
                      </Label>
                      <Input
                        id="targetSpend"
                        type="number"
                        value={targetSpend}
                        onChange={(e) => setTargetSpend(e.target.value)}
                        placeholder="1500"
                        className="rounded-none font-mono text-xs h-10 bg-background font-bold"
                      />
                    </div>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground block font-sans">
                    Calibrates your safe daily burn rate and cash flow projection algorithms.
                  </span>
                </div>

                <Button type="submit" className="w-full rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 cursor-pointer mt-1 bg-foreground text-background hover:bg-foreground/90">
                  Proceed to Habits <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full bg-card border border-border p-5 sm:p-6 md:p-7 space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4" /> Select Your Spending Habits
                </h3>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  LEGER_OS will pre-seed smart categorization rules so your bank statements are categorized automatically right out of the box.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] sm:max-h-[480px] overflow-y-auto pr-1">
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
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold uppercase text-[11px] tracking-wide text-foreground">{habit.name}</div>
                        <div className="text-[9px] opacity-70 font-sans mt-0.5 line-clamp-1">{habit.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <Button onClick={() => setStep(1)} variant="outline" className="rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 px-6 cursor-pointer">
                  Back
                </Button>
                <Button onClick={handleSeedAndProceed} className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                  Initialize {selectedHabits.length} Habit Rules <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full bg-card border border-border p-5 sm:p-6 md:p-7 space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                  <Sliders className="h-4 w-4" /> AI Intelligence Depth
                </h3>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  Calibrate your AI agent's analysis detail depth and verbal velocity.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {[
                  {
                    id: "concise",
                    title: "Concise & Direct",
                    desc: "Optimized for speed. AI replies will be brief, analytical, and data-dense.",
                    label: "Token Saver"
                  },
                  {
                    id: "standard",
                    title: "Balanced Mainframe",
                    desc: "Default mode. Balanced technical synthesis and conversational explanations.",
                    label: "Recommended"
                  },
                  {
                    id: "verbose",
                    title: "Detailed Financial Analyst",
                    desc: "Deep statistical breakdowns with comprehensive category trends and anomalies.",
                    label: "Deep Analysis"
                  }
                ].map((opt) => {
                  const isSel = yapLevel === opt.id
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setYapLevel(opt.id as any)}
                      className={cn(
                        "p-4 sm:p-5 border text-left cursor-pointer transition-all flex items-start justify-between select-none",
                        isSel 
                          ? "bg-primary/5 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                          : "bg-secondary/10 border-border hover:border-border-hover"
                      )}
                    >
                      <div className="space-y-1 pr-3">
                        <div className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                          {opt.title}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-sans max-w-[360px] leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {isSel && <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />}
                        <span className={cn("text-[8px] sm:text-[9px] font-mono uppercase px-2 py-0.5 border", isSel ? "border-emerald-500 text-emerald-500" : "border-border text-muted-foreground")}>
                          {opt.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <Button onClick={() => setStep(2)} variant="outline" className="rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 px-6 cursor-pointer">
                  Back
                </Button>
                <Button onClick={handleCompleteStep3} className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                  Continue to Device Sync <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full bg-card border border-border p-5 sm:p-6 md:p-7 space-y-4 shadow-2xl"
            >
              <AnimatePresence mode="wait">
                {!showProOffer ? (
                  deviceOs === "android" && step4SubStage === "apps" ? (
                    /* ANDROID SUBSTAGE: SELECT BANKING & PAYMENT APPS */
                    <motion.div
                      key="step4-apps-stage"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-foreground">
                            Select Installed Banking Apps
                          </h3>
                          <span className="text-[9px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border text-foreground font-bold">
                            {selectedBankApps.length} Selected
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                          Choose which banking & payment apps to monitor for incoming transaction alerts on Android:
                        </p>
                      </div>

                      {/* OS Switcher */}
                      <div className="grid grid-cols-2 p-1 bg-secondary/30 border border-border relative">
                        <button
                          type="button"
                          onClick={() => setDeviceOs("ios")}
                          className="relative py-2 text-[10px] sm:text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors z-10 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Apple className="h-3.5 w-3.5" /> Apple iOS
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviceOs("android")}
                          className="relative py-2 text-[10px] sm:text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors z-10 cursor-pointer text-background"
                        >
                          <div className="absolute inset-0 bg-foreground shadow-sm" />
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5" /> Android Native
                          </span>
                        </button>
                      </div>

                      {/* Search Bar & Scope Filters */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search banking, fintech, or installed apps..."
                            className="w-full h-8 pl-9 pr-3 text-xs bg-secondary/30 border border-border/60 rounded-none font-sans text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground"
                          />
                        </div>

                        {/* Scope Filter Tabs */}
                        <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto no-scrollbar">
                          <button
                            type="button"
                            onClick={() => setAppScopeTab("finance")}
                            className={cn(
                              "px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0 flex items-center gap-1.5",
                              appScopeTab === "finance"
                                ? "bg-foreground border-foreground text-background font-black shadow-xs"
                                : "bg-secondary/20 border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                            )}
                          >
                            <Building className="h-3 w-3" />
                            Finance & Banking ({installedApps.length > 0 ? installedApps.filter(a => a.isFinance).length : PRESET_BANK_APPS.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAppScopeTab("all")}
                            className={cn(
                              "px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0 flex items-center gap-1.5",
                              appScopeTab === "all"
                                ? "bg-foreground border-foreground text-background font-black shadow-xs"
                                : "bg-secondary/20 border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                            )}
                          >
                            <LayoutGrid className="h-3 w-3" />
                            All Installed Apps ({installedApps.length > 0 ? installedApps.length : PRESET_BANK_APPS.length})
                          </button>
                        </div>
                      </div>

                      {/* Bank App Cards Grid / Skeleton / Empty State */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1">
                        {isLoadingNativeApps ? (
                          /* Loading Skeleton */
                          Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-3 border border-border/50 bg-secondary/20 flex items-center justify-between animate-pulse">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-secondary/60 shrink-0" />
                                <div className="space-y-1.5">
                                  <div className="h-3 w-28 bg-secondary/60 rounded-xs" />
                                  <div className="h-2 w-16 bg-secondary/40 rounded-xs" />
                                </div>
                              </div>
                              <div className="w-4 h-4 rounded-xs bg-secondary/60 shrink-0" />
                            </div>
                          ))
                        ) : displayBanks.length === 0 ? (
                          /* Empty Detection State */
                          <div className="col-span-full p-5 border border-dashed border-border text-center space-y-3 bg-secondary/10">
                            <div className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center mx-auto text-muted-foreground">
                              <Building className="h-4 w-4" />
                            </div>
                            <div className="space-y-1 max-w-sm mx-auto">
                              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                                No Banking Apps Detected
                              </h4>
                              <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
                                {installedApps.length > 0
                                  ? "None of the installed apps were automatically recognized as banking services. Switch to All Apps to select any application on your device."
                                  : "No applications matched your search filter."}
                              </p>
                            </div>
                            {installedApps.length > 0 && appScopeTab === "finance" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAppScopeTab("all")
                                  setSearchQuery("")
                                }}
                                className="h-8 rounded-none border-border font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                              >
                                Select from All {installedApps.length} Apps on Phone →
                              </Button>
                            )}
                          </div>
                        ) : (
                          displayBanks.map((app) => {
                            const targetKey = app.package || app.id
                            const isSelected = selectedBankApps.includes(targetKey) || selectedBankApps.includes(app.id)
                            return (
                              <div
                                key={targetKey}
                                onClick={() => toggleBankSelection(app.id, app.package)}
                                className={cn(
                                  "p-3 border text-left cursor-pointer transition-all flex items-center justify-between select-none relative",
                                  isSelected 
                                    ? "bg-foreground/5 border-foreground ring-1 ring-foreground shadow-sm" 
                                    : "bg-secondary/10 border-border hover:border-border-hover opacity-70 hover:opacity-100"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <BankIconBadge domain={app.domain} name={app.name} />
                                  <div className="space-y-0.5 truncate">
                                    <div className="text-xs font-bold uppercase font-mono tracking-wide text-foreground truncate">
                                      {app.name}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-mono truncate">
                                      {app.type}
                                    </p>
                                  </div>
                                </div>

                                <div className={cn(
                                  "w-4 h-4 flex items-center justify-center border shrink-0",
                                  isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background"
                                )}>
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button 
                          onClick={() => setStep(3)} 
                          variant="outline" 
                          className="rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 px-6 cursor-pointer"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => setStep4SubStage("device")} 
                          className="flex-1 rounded-none uppercase font-mono text-xs tracking-widest h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-2"
                        >
                          Connect Device & Automate <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    /* SUBSTAGE 2: DEVICE CONNECTION (IOS / ANDROID) */
                    <motion.div
                      key="step4-setup"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-foreground">
                            Your Device is Ready!
                          </h3>
                          {deviceOs === "android" && (
                            <button
                              type="button"
                              onClick={() => setStep4SubStage("apps")}
                              className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline cursor-pointer"
                            >
                              ← Edit {selectedBankApps.length} Apps
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                          Your paycheck cycle and categorization rules are primed. Connect your device for real-time transaction ingestion:
                        </p>
                      </div>

                      {/* OS Segment Switcher with Smooth Spring Animation */}
                      <div className="grid grid-cols-2 p-1 bg-secondary/30 border border-border relative">
                        <button
                          type="button"
                          onClick={() => setDeviceOs("ios")}
                          className={cn(
                            "relative py-2 text-[10px] sm:text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors z-10 cursor-pointer",
                            deviceOs === "ios" ? "text-background" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {deviceOs === "ios" && (
                            <motion.div
                              layoutId="active-os-indicator"
                              className="absolute inset-0 bg-foreground shadow-sm"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Apple className="h-3.5 w-3.5" /> Apple iOS
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeviceOs("android")}
                          className={cn(
                            "relative py-2 text-[10px] sm:text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors z-10 cursor-pointer",
                            deviceOs === "android" ? "text-background" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {deviceOs === "android" && (
                            <motion.div
                              layoutId="active-os-indicator"
                              className="absolute inset-0 bg-foreground shadow-sm"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5" /> Android Native
                          </span>
                        </button>
                      </div>

                      {/* Dynamic OS Setup Container */}
                      <AnimatePresence mode="wait">
                        {deviceOs === "ios" ? (
                          <motion.div
                            key="ios-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="p-3.5 sm:p-4 bg-background border border-border space-y-3"
                          >
                            <AnimatePresence mode="wait">
                              {iosStage === 0 ? (
                                <motion.div
                                  key="ios-stage-0"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 10 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold uppercase font-mono tracking-wide text-foreground">
                                        Step 1 — Copy Webhook URL
                                      </span>
                                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 border border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-bold">
                                        Authenticated
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                                      Copy your private endpoint. Apple Shortcuts will transmit instant Apple Pay notifications here.
                                    </p>
                                  </div>

                                  <div className="p-2 sm:p-2.5 bg-secondary/30 border border-border flex items-center justify-between gap-2 font-mono text-[9px]">
                                    <span className="truncate text-foreground select-all font-bold">{productionEndpoint}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(productionEndpoint)
                                        toast.success("Webhook URL copied to clipboard!")
                                        setIosStage(1)
                                      }}
                                      className="shrink-0 p-1 hover:text-emerald-500 text-muted-foreground transition-colors cursor-pointer"
                                      title="Copy URL"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof window !== "undefined") {
                                          window.location.href = "shortcuts://"
                                        }
                                      }}
                                      className="w-full py-2.5 px-3 bg-secondary/50 border border-border text-[10px] font-mono uppercase font-bold text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <Apple className="h-3.5 w-3.5" />
                                      <span>Open Shortcuts App</span>
                                    </button>

                                    <Button 
                                      onClick={handleProceedFromStep4} 
                                      className="w-full rounded-none uppercase font-mono text-[10px] font-bold tracking-wider h-10 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                      <span>Finish & Activate</span> <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="ios-stage-1"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase font-mono tracking-wide text-foreground flex items-center gap-1.5">
                                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Step 2 — Shortcuts Setup
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIosStage(0)}
                                      className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline cursor-pointer"
                                    >
                                      ← Back to URL
                                    </button>
                                  </div>

                                  <div className="p-3 bg-secondary/15 border border-border/70 space-y-2 text-[10px] font-sans text-muted-foreground leading-relaxed">
                                    <p className="font-mono text-[9px] font-bold uppercase text-foreground">In Apple Shortcuts App (iOS 17+):</p>
                                    <ol className="space-y-2 text-[9px] sm:text-[10px]">
                                      <li className="flex items-start gap-1.5">
                                        <span className="font-mono font-bold text-foreground shrink-0">1.</span>
                                        <span>Open <strong className="text-foreground">Shortcuts</strong> → Tap <strong className="text-foreground">Automation</strong> tab → Tap <strong className="text-foreground">+</strong></span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="font-mono font-bold text-foreground shrink-0">2.</span>
                                        <span>Choose <strong className="text-foreground">Transaction</strong> → Card: <strong className="text-foreground">Any</strong> → Select <strong className="text-foreground">Run Immediately</strong></span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="font-mono font-bold text-foreground shrink-0">3.</span>
                                        <span>Add Action: <strong className="text-foreground">Get Contents of URL</strong> → Paste your URL → Set Method to <strong className="text-foreground">POST</strong> & Body to <strong className="text-foreground">Shortcut Input</strong></span>
                                      </li>
                                    </ol>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof window !== "undefined") {
                                          window.location.href = "shortcuts://"
                                        }
                                      }}
                                      className="w-full py-2.5 px-3 bg-secondary/50 border border-border text-[10px] font-mono uppercase font-bold text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <Apple className="h-3.5 w-3.5" />
                                      <span>Open Shortcuts App</span>
                                    </button>

                                    <Button 
                                      onClick={handleProceedFromStep4} 
                                      className="w-full rounded-none uppercase font-mono text-[10px] font-bold tracking-wider h-10 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                      <span>Finish & Activate</span> <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="android-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="p-3.5 sm:p-4 bg-background border border-border space-y-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase font-mono tracking-wide text-foreground">
                                  Background Notification Listener
                                </span>
                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 border border-border text-foreground bg-secondary font-bold">
                                  Zero Touch
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                                Directly ingests payment notifications from banking apps on this device in memory.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] font-mono pt-1">
                              <div className="p-2 bg-secondary/20 border border-border/70 flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Zero Storage: Raw texts discarded after token extraction.</span>
                              </div>
                              <div className="p-2 bg-secondary/20 border border-border/70 flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Isolated DB: Transmitted with 256-bit SSL encryption.</span>
                              </div>
                            </div>

                            <Button 
                              onClick={handleProceedFromStep4} 
                              className="w-full rounded-none uppercase font-mono text-[11px] sm:text-xs tracking-wider h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-2 px-3 text-center"
                            >
                              <Smartphone className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Activate Android Sync</span>
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Fallback Option */}
                      <div className="flex items-center justify-between gap-3 text-center opacity-40">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[9px] font-mono text-muted-foreground uppercase font-bold tracking-wider">OR</span>
                        <div className="h-px bg-border flex-1" />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
                        <button 
                          type="button"
                          onClick={() => handleCompleteOnboarding('/expenses')} 
                          className="w-full sm:w-auto px-4 py-2 bg-secondary/15 hover:bg-secondary/40 border border-border/60 text-muted-foreground hover:text-foreground text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3 shrink-0" />
                          <span>Upload Statement (.pdf / .txt)</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleCompleteOnboarding('/')} 
                          className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 text-muted-foreground/70 hover:text-foreground underline transition-colors cursor-pointer"
                        >
                          Skip Ingestion →
                        </button>
                      </div>
                    </motion.div>
                  )
                ) : (
                  /* PRO INTRODUCTORY OFFER SCREEN (NEW USERS) */
                  <motion.div
                    key="step4-pro-offer"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>NEW USER OFFER - 50% OFF</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProOffer(false)}
                        className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        ← Back to Setup
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">
                        Your Device is Ready!
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        {deviceOs === "ios" 
                          ? "Real-time Apple Pay transaction ingestion and predictive cash flow modeling are powered by LEGER_OS PRO."
                          : "Real-time Android background notification ingestion and predictive cash flow modeling are powered by LEGER_OS PRO."}
                      </p>
                    </div>

                    {/* Standardized Emerald Offer Card */}
                    <div className="border border-emerald-500/40 bg-emerald-500/10 divide-y divide-emerald-500/20">
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase bg-emerald-500 text-emerald-950 font-bold px-2 py-0.5 tracking-wider inline-flex items-center justify-center text-center">
                            NEW USER OFFER
                          </span>
                          <p className="text-xs font-bold text-foreground">
                            First Month 50% Off
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground line-through font-mono">{fullPriceFormatted}/mo</p>
                          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight leading-tight">
                            {halfPriceFormatted}
                            <span className="text-[11px] text-emerald-500/80 font-normal"> / 1st mo</span>
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 text-xs font-sans text-muted-foreground space-y-2">
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground text-[11px] font-mono">
                            {deviceOs === "ios" ? "Real-Time Apple Pay & Wallet Ingestion" : "Real-Time Android Push & Banking Listener"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground text-[11px] font-mono">AI Neural Ingestion & Categorization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground text-[11px] font-mono">Recency Decay Cash Forecasts & Overrides</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground font-sans text-center leading-relaxed">
                      Transparent tax-inclusive pricing. Renews at {fullPriceFormatted}/mo after 30 days. Cancel anytime with 1 click.
                    </p>

                    <div className="space-y-2 pt-1">
                      <Button
                        onClick={async () => {
                          try {
                            await claimProDiscount()
                          } catch {
                            toast.error("Failed to open checkout")
                          }
                        }}
                        className="w-full h-11 sm:h-12 rounded-none bg-emerald-600 text-white hover:bg-emerald-500 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Claim 50% Off & Launch PRO ({halfPriceFormatted})
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleCompleteOnboarding('/')}
                        className="w-full text-center text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground underline cursor-pointer py-1.5 transition-colors block"
                      >
                        Skip Offer & Continue on Free Core Tier →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
