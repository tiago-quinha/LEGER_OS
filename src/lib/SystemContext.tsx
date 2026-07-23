"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Session } from "@supabase/supabase-js"
import { formatCurrency as formatCurr, formatDate as formatDt, getCurrencySymbol } from "@/lib/format"
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
  aiProvider: string
  customApiKey: string
  decayWeight: number
  paycheckKeyword: string
  upgradeToPro: () => Promise<void>
  cancelPro: () => Promise<void>
  
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

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user || null)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
      setIsLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
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
  const aiProvider = profile?.ai_provider || "gemini"
  const customApiKey = profile?.custom_api_key || ""
  const decayWeight = profile?.decay_weight !== undefined ? Number(profile.decay_weight) : 0.12
  const paycheckKeyword = profile?.paycheck_keyword || "SALARY"

  const upgradeToPro = async () => {
    if (!user) {
      toast.error("Please log in to upgrade to LEGER_OS PRO")
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'PRO',
          ai_quota_limit: 300,
          ai_quota_usage: 0 
        })
        .eq('id', user.id)
      if (error) throw error
      toast.success("Welcome to LEGER_OS PRO! All advanced AI & predictive models unlocked.")
      await refreshProfile()
      refreshData()
    } catch (err) {
      toast.error("Failed to upgrade tier")
    }
  }

  const cancelPro = async () => {
    if (!user) {
      toast.error("Please log in to manage your subscription")
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'FREE',
          ai_quota_limit: 50 
        })
        .eq('id', user.id)
      if (error) throw error
      toast.success("LEGER_OS PRO subscription cancelled. Returned to Core Free Tier.")
      await refreshProfile()
      refreshData()
    } catch (err) {
      toast.error("Failed to cancel subscription")
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
      aiProvider,
      customApiKey,
      decayWeight,
      paycheckKeyword,
      upgradeToPro,
      cancelPro,
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
      setSubscriptionOnly
    }}>
      {children}
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
