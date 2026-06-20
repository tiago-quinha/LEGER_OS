"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Session } from "@supabase/supabase-js"

interface SystemContextType {
  // Auth State
  user: User | null
  session: Session | null
  profile: any | null
  isLoading: boolean
  
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
  signOut: () => Promise<void>
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

  return (
    <SystemContext.Provider value={{ 
      user,
      session,
      profile,
      isLoading,
      isPrivacyMode, 
      setPrivacyMode, 
      isAuditPanelOpen, 
      setAuditPanelOpen, 
      activeTransactionId, 
      setActiveTransactionId,
      systemLatency,
      nodeStatus,
      refreshData,
      signOut
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
