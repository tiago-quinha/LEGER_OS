"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Session } from "@supabase/supabase-js"
import { formatCurrency as formatCurr, formatDate as formatDt, getCurrencySymbol, getProPrice } from "@/lib/format"
import { StripePaymentModal } from "@/components/StripePaymentModal"
import { StripeManageDrawer } from "@/components/StripeManageDrawer"
import { FeedbackDrawer } from "@/components/FeedbackDrawer"
import { toast } from "sonner"

interface SystemContextType {
  // Auth State
  user: User | null
  session: Session | null
  profile: any | null
  isLoading: boolean
  
  // Localization State & Helpers
  currency: string
  language: string
  currencySymbol: string
  formatCurrency: (amount: number | string, decimals?: number) => string
  formatDate: (dateStr: string | Date) => string
  
  // Monetization & Customization State
  subscriptionTier: "FREE" | "PRO"
  isPro: boolean
  isAdmin: boolean
  aiProvider: string
  customApiKey: string
  decayWeight: number
  paycheckKeyword: string
  upgradeToPro: () => Promise<void>
  cancelPro: (surveyData?: { reason?: string; feedback?: string }) => Promise<void>
  claimProDiscount: () => Promise<void>
  openStripePortal: () => Promise<void>
  openStripeManageDrawer: () => Promise<void>
  
  // UI State
  isPrivacyMode: boolean
  setPrivacyMode: (val: boolean) => void
  isAuditPanelOpen: boolean
  setAuditPanelOpen: (val: boolean) => void
  activeTransactionId: string | null
  setActiveTransactionId: (id: string | null) => void
  systemLatency: number
  nodeStatus: "ONLINE" | "SYNCHRONIZING" | "OFFLINE"
  refreshData: () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>

  // Global settings modal state
  isSettingsOpen: boolean
  setSettingsOpen: (val: boolean) => void
  settingsActiveTab: string
  setSettingsActiveTab: (val: string) => void
  isSubscriptionOnly: boolean
  setSubscriptionOnly: (val: boolean) => void

  // Feedback & Bug Reporting Drawer
  isFeedbackOpen: boolean
  setFeedbackOpen: (val: boolean) => void
  openFeedbackDrawer: (category?: string, context?: string) => void
}

const SystemContext = createContext<SystemContextType | undefined>(undefined)

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isPrivacyMode, setPrivacyMode] = useState(false)
  const [isAuditPanelOpen, setAuditPanelOpen] = useState(false)
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [systemLatency, setSystemLatency] = useState(12)
  const [nodeStatus, setNodeStatus] = useState<"ONLINE" | "SYNCHRONIZING" | "OFFLINE">("ONLINE")

  // Global settings modal state
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [settingsActiveTab, setSettingsActiveTab] = useState("paycheck")
  const [isSubscriptionOnly, setSubscriptionOnly] = useState(false)

  // Feedback & Bug Reporting Drawer state
  const [feedbackState, setFeedbackState] = useState<{
    isOpen: boolean
    category: string
    context: string
  }>({
    isOpen: false,
    category: "general",
    context: "",
  })

  const openFeedbackDrawer = (category: string = "general", context: string = "") => {
    setFeedbackState({
      isOpen: true,
      category,
      context,
    })
  }

  const setFeedbackOpen = (val: boolean) => {
    setFeedbackState(prev => ({ ...prev, isOpen: val }))
  }

  // Auth initialization
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        setUser(session?.user || null)
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (isMounted) setProfile(profile)
        }
      } catch (err) {
        console.warn("[Auth Init Error]:", err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (isMounted) setProfile(profile)
      } else {
        if (isMounted) setProfile(null)
      }
      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshData = () => {
    setNodeStatus("SYNCHRONIZING")
    router.refresh()
    setTimeout(() => setNodeStatus("ONLINE"), 800)
  }

  const refreshProfile = async () => {
    if (!user) return
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (updatedProfile) setProfile(updatedProfile)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Simulate jitter in latency
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLatency(prev => {
        const jitter = Math.floor(Math.random() * 5) - 2
        return Math.max(8, Math.min(25, prev + jitter))
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const currency = profile?.currency || "EUR"
  const language = profile?.language || "en-US"
  const currencySymbol = getCurrencySymbol(currency)
  const subscriptionTier = profile?.subscription_tier || "FREE"
  const isPro = subscriptionTier === "PRO"
  const isAdmin = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_admin"
  const aiProvider = profile?.ai_provider || "gemini"
  const customApiKey = profile?.custom_api_key || ""
  const decayWeight = profile?.decay_weight !== undefined ? Number(profile.decay_weight) : 0.0462
  const paycheckKeyword = profile?.paycheck_keyword || "SALARY"

  const [stripeModalState, setStripeModalState] = useState<{
    isOpen: boolean
    clientSecret: string
    amountFormatted: string
    isDiscountClaim: boolean
  }>({
    isOpen: false,
    clientSecret: "",
    amountFormatted: "",
    isDiscountClaim: false,
  })

  const upgradeToPro = async () => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDiscountClaim: false })
      })
      const data = await res.json()

      if (res.ok && data.clientSecret) {
        const proPriceObj = getProPrice(currency)
        setStripeModalState({
          isOpen: true,
          clientSecret: data.clientSecret,
          amountFormatted: proPriceObj.formatted,
          isDiscountClaim: false,
        })
        return
      }

      if (data.error && !data.error.includes("not configured")) {
        toast.error(data.error)
        return
      }

      // Dev fallback for unconfigured environment
      const fallbackRes = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upgrade' })
      })
      const fallbackData = await fallbackRes.json()
      if (!fallbackRes.ok) throw new Error(fallbackData.error || "Failed to upgrade")

      toast.success("Welcome to LEGER_OS PRO! All advanced AI & predictive models unlocked.")
      await refreshProfile()
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Failed to upgrade tier")
    }
  }

  const cancelPro = async (surveyData?: { reason?: string; feedback?: string }) => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'cancel',
          reason: surveyData?.reason,
          feedback: surveyData?.feedback
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to cancel")

      toast.success("LEGER_OS PRO subscription cancelled. Returned to Core Base Tier.")
      await refreshProfile()
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription")
    }
  }

  const claimProDiscount = async () => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDiscountClaim: true })
      })
      const data = await res.json()

      if (res.ok && data.clientSecret) {
        const proPriceObj = getProPrice(currency)
        const halfPrice = (parseFloat(proPriceObj.amount) / 2).toFixed(2)
        setStripeModalState({
          isOpen: true,
          clientSecret: data.clientSecret,
          amountFormatted: `${proPriceObj.symbol}${halfPrice}`,
          isDiscountClaim: true,
        })
        return
      }

      if (data.error && !data.error.includes("not configured")) {
        toast.error(data.error)
        return
      }

      // Dev fallback for unconfigured environment
      const fallbackRes = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_discount' })
      })
      const fallbackData = await fallbackRes.json()
      if (!fallbackRes.ok) throw new Error(fallbackData.error || "Failed to apply discount")

      toast.success("Exclusive 50% discount applied! You retain full PRO access.")
      await refreshProfile()
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Failed to apply discount")
    }
  }

  const [stripeManageState, setStripeManageState] = useState<{
    isOpen: boolean
    clientSecret: string
  }>({
    isOpen: false,
    clientSecret: "",
  })

  const openStripeManageDrawer = async () => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const res = await fetch('/api/stripe/create-setup-intent', { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.clientSecret) {
        setStripeManageState({
          isOpen: true,
          clientSecret: data.clientSecret,
        })
        return
      }

      if (data.error && !data.error.includes("not configured")) {
        toast.error(data.error)
        return
      }

      toast.info("Stripe Billing Portal is unconfigured. Add your STRIPE_SECRET_KEY to .env to enable portal access.")
    } catch {
      toast.info("Stripe Billing Portal is unconfigured. Add your STRIPE_SECRET_KEY to .env to enable portal access.")
    }
  }

  const openStripePortal = async () => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const contentType = res.headers.get("content-type") || ""

      if (contentType.includes("application/json")) {
        const data = await res.json()
        if (res.ok && data.url) {
          window.location.href = data.url
          return
        }
        if (data.error) {
          toast.info(data.error)
          return
        }
      }

      toast.info("Stripe Billing Portal is unconfigured. Add your STRIPE_SECRET_KEY to .env to enable portal access.")
    } catch {
      toast.info("Stripe Billing Portal is unconfigured. Add your STRIPE_SECRET_KEY to .env to enable portal access.")
    }
  }

  const formatCurrency = (amount: number | string, decimals: number = 2) => {
    return formatCurr(amount, currency, decimals)
  }

  const formatDate = (dateStr: string | Date) => {
    return formatDt(dateStr, language)
  }

  return (
    <SystemContext.Provider value={{ 
      user,
      session,
      profile,
      isLoading,
      currency,
      language,
      currencySymbol,
      formatCurrency,
      formatDate,
      subscriptionTier,
      isPro,
      isAdmin,
      aiProvider,
      customApiKey,
      decayWeight,
      paycheckKeyword,
      upgradeToPro,
      cancelPro,
      claimProDiscount,
      openStripePortal,
      openStripeManageDrawer,
      isPrivacyMode, 
      setPrivacyMode, 
      isAuditPanelOpen, 
      setAuditPanelOpen, 
      activeTransactionId, 
      setActiveTransactionId,
      systemLatency,
      nodeStatus,
      refreshData,
      refreshProfile,
      signOut,
      isSettingsOpen,
      setSettingsOpen,
      settingsActiveTab,
      setSettingsActiveTab,
      isSubscriptionOnly,
      setSubscriptionOnly,
      isFeedbackOpen: feedbackState.isOpen,
      setFeedbackOpen,
      openFeedbackDrawer,
    }}>
      {children}
      <StripePaymentModal
        isOpen={stripeModalState.isOpen}
        onClose={() => setStripeModalState(prev => ({ ...prev, isOpen: false }))}
        clientSecret={stripeModalState.clientSecret}
        amountFormatted={stripeModalState.amountFormatted}
        isDiscountClaim={stripeModalState.isDiscountClaim}
      />
      <StripeManageDrawer
        isOpen={stripeManageState.isOpen}
        onClose={() => setStripeManageState(prev => ({ ...prev, isOpen: false }))}
        clientSecret={stripeManageState.clientSecret}
      />
      <FeedbackDrawer
        isOpen={feedbackState.isOpen}
        onClose={() => setFeedbackState(prev => ({ ...prev, isOpen: false }))}
        initialCategory={feedbackState.category}
        initialContext={feedbackState.context}
      />
    </SystemContext.Provider>
  )
}

export function useSystem() {
  const context = useContext(SystemContext)
  if (context === undefined) {
    throw new Error("useSystem must be used within a SystemProvider")
  }
  return context
}
