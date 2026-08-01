"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, X, ShieldCheck, Sparkles, MessageSquare, RefreshCcw, History, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { getAIHeaders } from "@/lib/ai-client"
import { toast } from "sonner"
import { renderFormattedText } from "./LegerAIAssistant"

interface LegerAIPageViewProps {
  cycleData: any
  expenses: any[]
  categories: any[]
}

export function LegerAIPageView({ cycleData, expenses, categories }: LegerAIPageViewProps) {
  const { profile, user, refreshProfile, currencySymbol, language, aiProvider, customApiKey, isPro, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Interactive Client State
  const [displayMessage, setDisplayMessage] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<any | null>(null)
  const [userQuery, setUserQuery] = useState("")
  const [isQuerying, setIsQuerying] = useState(false)

  const userName = profile?.username || profile?.full_name || "User"

  const totalOut = useMemo(() => expenses
    .filter(e => parseFloat(e.amount) < 0)
    .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0), [expenses])

  const totalIn = useMemo(() => expenses
    .filter(e => parseFloat(e.amount) > 0)
    .reduce((sum, e) => sum + parseFloat(e.amount), 0), [expenses])

  const spendingLimit = profile?.target_monthly_spend || 1500

  // Cache Key grounded in a stable data fingerprint (v3 forces cache-busting for the new prompt format)
  const fingerprint = `${Math.round(cycleData.currentBalance)}_${cycleData.categories.length}_${profile?.id || 'guest'}`
  const cacheKey = `leger_insight_v3_${fingerprint}`

  const runAnalysis = async (force = false) => {
    setErrorMessage(null)
    
    // Check cache first if not forced
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          
          // Invalidate cache if older than 12 hours
          const cacheAgeMs = Date.now() - Number(timestamp)
          if (cacheAgeMs < 12 * 60 * 60 * 1000) {
            setAnalysis(data)
            setDisplayMessage(data.message)
            setActiveFilters(null)
            setLastUpdated(new Date(Number(timestamp)).toLocaleString())
            return
          } else {
            localStorage.removeItem(cacheKey)
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/analyze-cycle", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
        body: JSON.stringify({
          currentBalance: cycleData.currentBalance,
          velocity: cycleData.velocity,
          categories: cycleData.categories,
          totalIn,
          totalOut,
          spendingLimit,
          userName: userName
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const timestamp = Date.now()
        setAnalysis(data)
        setDisplayMessage(data.message)
        setActiveFilters(null)
        setLastUpdated(new Date(timestamp).toLocaleString())
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }))
      } else {
        setErrorMessage(data.error || "Neural synthesis failed.")
      }
    } catch (err) {
      console.error(err)
      setErrorMessage("Lost contact with the mainframe.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const hasData = cycleData.currentBalance > 0 || cycleData.categories.length > 0;
    if (profile && hasData) runAnalysis()
  }, [cacheKey, !!profile, cycleData.currentBalance, cycleData.categories.length])

  // Handle natural language custom prompt query
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userQuery.trim() || isQuerying || isLoading) return

    if (!isPro) {
      toast.error("Leger AI Custom Queries are a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock conversational overrides and custom projections.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }

    setIsQuerying(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/leger-ai/query", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
        body: JSON.stringify({
          query: userQuery,
          expenses,
          categories,
          userName,
          clientDate: new Date().toISOString()
        })
      })
      const data = await response.json()
      if (response.ok) {
        setDisplayMessage(data.message)
        setActiveFilters(data.filters)
        setUserQuery("")
        if (data.override) {
          try {
            let updated: any[] = []
            if (!data.override.reset) {
              const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
              updated = existing.filter((o: any) => o.categoryId !== data.override.categoryId)
              updated.push(data.override)
            }
            
            localStorage.setItem("leger_cycle_overrides", JSON.stringify(updated))
            
            if (user) {
              await supabase
                .from("profiles")
                .update({ projection_overrides: updated })
                .eq("id", user.id)
              await refreshProfile()
            }
            
            window.dispatchEvent(new Event("leger_overrides_updated"))
          } catch (e) {}
        }
      } else {
        setErrorMessage(data.error || "Leger AI query diagnostics failed.")
      }
    } catch (err) {
      console.error(err)
      setErrorMessage("Leger AI query node connection lost.")
    } finally {
      setIsQuerying(false)
    }
  }

  // Filter transaction grid dynamically based on active filters
  const filteredExpenses = useMemo(() => {
    const list = expenses || []
    if (!activeFilters) return list

    const { categoryId, merchant, amountMin, amountMax, type } = activeFilters

    return list.filter((e: any) => {
      const amt = Math.abs(parseFloat(e.amount))
      
      // Category match
      if (categoryId !== null && categoryId !== undefined && e.category_id !== categoryId) {
        return false
      }
      
      // Merchant search
      if (merchant) {
        const searchStr = merchant.toLowerCase()
        if (!e.merchant || !e.merchant.toLowerCase().includes(searchStr)) {
          return false
        }
      }
      // Amount min
      if (amountMin !== null && amountMin !== undefined && amt < amountMin) {
        return false
      }
      
      // Amount max
      if (amountMax !== null && amountMax !== undefined && amt > amountMax) {
        return false
      }
      
      // Type match
      if (type === "expense" && parseFloat(e.amount) >= 0) return false
      if (type === "income" && parseFloat(e.amount) <= 0) return false

      return true
    })
  }, [expenses, activeFilters])
  if (!isPro) {
    return (
      <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-12 pb-24 text-foreground w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-foreground/10 pb-8 relative">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span>Neural Synthesis</span>
              <span className="opacity-30">/</span>
              <span>STRATEGY_NODE</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-none">
              Leger AI
            </h1>
          </div>
        </header>

        {/* Brutalist Lock Banner */}
        <div className="border border-border bg-card relative p-8 md:p-16 text-center overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          {/* Cyber OS background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="space-y-6 max-w-md z-10 font-mono">
            <div className="mx-auto w-12 h-12 bg-secondary flex items-center justify-center ledger-border mb-4">
              <Brain className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-foreground">NEURAL BRIDGE OFFLINE</h3>
            <p className="text-xs text-muted-foreground uppercase leading-relaxed">
              Leger AI diagnostics and conversational query tools are restricted to **LEGER_OS PRO** nodes. Upgrade your subscription to unlock automated category recommendations, conversational queries, and deficit alarms.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => {
                  setSettingsActiveTab("pro");
                  setSubscriptionOnly(true);
                  setSettingsOpen(true);
                }} 
                className="px-6 py-3 bg-foreground text-background text-xs uppercase font-mono font-bold tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]"
              >
                UPGRADE TO PRO NODE
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-12 pb-24 text-foreground w-full"
    >
      {/* 1. Header: The Intelligence Node */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-foreground/10 pb-8 relative">
        <div className="absolute top-0 right-0 technical-label opacity-20 hidden lg:block uppercase tracking-widest text-[9px]">
          NODE_ID: LEGER_CORE_05 // ENCRYPTED
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-4 w-4 animate-pulse text-foreground/80" />
            <span>Neural Synthesis</span>
            <span className="opacity-30">/</span>
            <span>STRATEGY_NODE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-none">
            Leger AI
          </h1>
        </div>

        <MagneticButton 
          variant="outline" 
          onClick={() => runAnalysis(true)} 
          disabled={isLoading}
          strength={0.2}
          className="rounded-none font-mono text-[10px] uppercase tracking-widest h-12 px-6 ledger-border hover:bg-secondary w-full md:w-auto text-foreground"
        >
          <RefreshCcw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} />
          Force Sync
        </MagneticButton>
      </header>

      {/* 2. Main Terminal Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        
        {/* Left Column: Cycle Metrics */}
        <div className="lg:col-span-1 space-y-6 lg:space-y-12">
           <div className="space-y-6">
               <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="technical-label text-foreground/70">Cycle Performance</h3>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1.5 py-2 border-b border-border/50">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Spend Ratio</span>
                        <span className={cn("font-mono text-xs font-bold", (analysis?.threatLevel > 70) ? "text-destructive" : "text-foreground")}>
                           {analysis?.threatLevel || 0}%
                        </span>
                     </div>
                     <div className="w-full h-1.5 bg-secondary/50 border border-border/40 overflow-hidden relative">
                        <div className={cn("h-full transition-all duration-1000", (analysis?.threatLevel > 70) ? "bg-destructive" : "bg-foreground")} style={{ width: `${analysis?.threatLevel || 0}%` }} />
                     </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                     <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Cycle Velocity</span>
                     <span className="font-mono text-xs font-bold">{cycleData.velocity.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                     <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Last Sync</span>
                     <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase">{lastUpdated || "WAITING..."}</span>
                  </div>
               </div>
            </div>

            <div className="p-6 bg-secondary/5 border border-border space-y-4 shadow-sm">
               <div className="flex items-center gap-2 technical-label text-muted-foreground opacity-60">
                  <History className="h-3 w-3" />
                  <span>Cycle Timeline</span>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                     <span className="uppercase">Elapsed Progress</span>
                     <span className="font-bold">{cycleData.daysElapsed} Days</span>
                  </div>
                  <div className="w-full h-1 bg-secondary/50 overflow-hidden relative">
                     <div className="h-full bg-foreground" style={{ width: `${Math.min(100, (cycleData.daysElapsed / 30) * 100)}%` }} />
                  </div>
               </div>
            </div>

            <div className="p-6 bg-secondary/5 border border-border space-y-4 shadow-sm">
               <div className="flex items-center gap-2 technical-label text-muted-foreground opacity-60">
                  <Zap className="h-3 w-3" />
                  <span>Burn Rate Details</span>
               </div>
               <div className="space-y-2.5 font-mono text-[10px]">
                  <div className="flex justify-between items-center py-1 border-b border-border/20">
                     <span className="text-muted-foreground uppercase">Current Burn:</span>
                     <span className="font-bold text-foreground">{currencySymbol}{(totalOut / Math.max(1, cycleData.daysElapsed)).toFixed(2)}/d</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/20">
                     <span className="text-muted-foreground uppercase">Budget Pace:</span>
                     <span className="font-bold text-foreground">{currencySymbol}{(spendingLimit / 30).toFixed(2)}/d</span>
                  </div>
               </div>
            </div>
        </div>

         {/* Right Column: Leger Feed */}
         <div className="lg:col-span-2 space-y-8">
            <div className="min-h-[400px] border border-border bg-card relative p-6 md:p-12 pt-14 md:pt-14 flex flex-col justify-between overflow-hidden text-left shadow-xl backdrop-blur-md">
               {/* background grid */}
               <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
               
               {/* glowing aura */}
               <div className="absolute -top-40 -left-40 w-80 h-80 bg-foreground/[0.015] dark:bg-emerald-500/[0.015] blur-3xl rounded-full pointer-events-none" />
               
               <div className="absolute top-6 left-6 technical-label opacity-15 uppercase tracking-[0.4em] z-10">AI Analysis Output</div>
               
               {/* Query Input Form */}
               <form onSubmit={handleQuerySubmit} className="mt-4 mb-8 border-b border-border pb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center z-10">
                  <div className="flex-1 relative">
                     <input 
                       type="text"
                       value={userQuery}
                       onChange={(e) => setUserQuery(e.target.value)}
                       placeholder="Ask Leger AI about your cycle spending..."
                       disabled={isQuerying || isLoading}
                       className="w-full px-4 py-2 border border-border bg-secondary/10 font-mono text-xs uppercase tracking-tighter outline-none focus:border-foreground/45 transition-colors h-10 rounded-none text-foreground placeholder:text-muted-foreground/30"
                     />
                  </div>
                  <MagneticButton 
                    type="submit" 
                    disabled={isQuerying || isLoading}
                    variant="none"
                    strength={0.35}
                    className="h-10 px-6 font-mono text-[9px] uppercase tracking-widest bg-foreground text-background font-bold hover:bg-foreground/80 rounded-none shrink-0 w-full sm:w-auto"
                  >
                     {isQuerying ? "RUNNING..." : "EXECUTE"}
                  </MagneticButton>
               </form>

               {isLoading ? (
                 <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-12 z-10">
                    <div className="relative">
                       <Cpu className="h-16 w-16 text-foreground animate-spin-slow opacity-20" />
                       <Brain className="absolute inset-0 h-16 w-16 text-foreground animate-pulse" />
                    </div>
                    <p className="text-sm font-mono text-muted-foreground animate-pulse uppercase tracking-[0.2em]">Consulting the Leger AI, {userName}...</p>
                 </div>
               ) : errorMessage ? (
                 <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center py-12 z-10">
                    <AlertTriangle className="h-12 w-12 text-destructive animate-pulse" />
                    <p className="text-lg font-bold tracking-tight text-destructive uppercase max-w-xs">{errorMessage}</p>
                    <MagneticButton variant="ghost" onClick={() => runAnalysis(true)} strength={0.3} className="technical-label hover:text-foreground underline uppercase text-foreground">Retry connection</MagneticButton>
                 </div>
               ) : displayMessage ? (
                 <div className="space-y-12 z-10">
                     <div className="flex gap-6">
                        <div className="mt-1 p-2 bg-foreground text-background ledger-border h-fit shrink-0">
                           <MessageSquare className="h-6 w-6" />
                        </div>
                        <div className="space-y-6 flex-1">
                           <AnimatePresence mode="wait">
                              <motion.div 
                                key={displayMessage}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className="space-y-6"
                              >
                                 <p className="text-base md:text-lg font-medium text-muted-foreground leading-relaxed tracking-wide">
                                   {renderFormattedText(displayMessage)}
                                 </p>
                                 
                                 {displayMessage === analysis?.message && analysis?.actionItem && (
                                   <div className="p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg flex items-start gap-3">
                                      <Brain className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-mono uppercase font-bold text-amber-500 tracking-wider">Tactical Advisory</p>
                                         <p className="text-sm text-foreground font-medium leading-relaxed">
                                            {renderFormattedText(analysis.actionItem)}
                                         </p>
                                      </div>
                                   </div>
                                 )}
                              </motion.div>
                           </AnimatePresence>
                        </div>
                     </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-8 md:pt-12 border-t border-border/50">
                        <div className="space-y-2 font-mono">
                           <div className="flex items-center gap-2 technical-label opacity-60 text-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>Cycle Cash Flow</span>
                           </div>
                           <div className="text-lg font-bold">
                              {currencySymbol}{((cycleData.totalIn || 0) - (cycleData.totalOut || 0)).toFixed(2)}
                           </div>
                           <div className="text-[9px] uppercase tracking-tighter text-muted-foreground">
                              {((cycleData.totalIn || 0) - (cycleData.totalOut || 0)) >= 0 ? "Net Cash Flow Surplus" : "Net Cash Flow Deficit"}
                           </div>
                        </div>
                        
                        <div className="space-y-2 font-mono">
                           <div className="flex items-center gap-2 technical-label opacity-60 text-foreground">
                              <ShieldCheck className="h-3 w-3" />
                              <span>Budget Allocation</span>
                           </div>
                           <div className="text-lg font-bold">
                              {spendingLimit > 0 ? ((totalOut / spendingLimit) * 100).toFixed(1) : 0}%
                           </div>
                           <div className="text-[9px] uppercase tracking-tighter text-muted-foreground">
                              {currencySymbol}{totalOut.toFixed(2)} utilized of {currencySymbol}{spendingLimit.toFixed(2)}
                           </div>
                        </div>
                     </div>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center py-12 z-10">
                    <MagneticButton 
                      onClick={() => runAnalysis()} 
                      variant="ghost" 
                      strength={0.3}
                      className="technical-label uppercase hover:text-foreground tracking-widest px-6 py-3 border border-border/40 hover:border-foreground/30 rounded-none transition-all duration-300 text-foreground"
                    >
                       <Zap className="mr-2 h-3.5 w-3.5 animate-pulse" /> Initialize Neural Bridge
                    </MagneticButton>
                 </div>
               )}

               {/* Decorative scanline */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/[0.02] dark:via-emerald-500/[0.03] to-transparent h-24 w-full -translate-y-full animate-scan pointer-events-none" />
            </div>

            {/* Top Category Outflows panel */}
            <div className="border border-border ledger-border bg-card p-6 space-y-4">
               <div className="technical-label text-muted-foreground opacity-60">Top Category Outflows</div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {cycleData.categories.slice(0, 3).map((cat: any, i: number) => {
                     const percentage = totalOut > 0 ? (cat.value / totalOut) * 100 : 0;
                     return (
                        <div key={i} className="space-y-2 font-mono">
                           <div className="flex justify-between text-[9px]">
                              <span className="uppercase font-bold text-muted-foreground">{cat.name}</span>
                              <span className="text-foreground">{percentage.toFixed(0)}%</span>
                           </div>
                           <div className="w-full h-1 bg-secondary/50 overflow-hidden relative">
                              <div className="h-full bg-foreground/60" style={{ width: `${percentage}%` }} />
                           </div>
                           <div className="text-[8px] text-muted-foreground uppercase">
                              Spent: {currencySymbol}{cat.value.toFixed(0)}
                           </div>
                        </div>
                     );
                  })}
                  {cycleData.categories.length === 0 && (
                     <div className="col-span-3 text-center text-muted-foreground font-mono text-[10px] uppercase italic">
                        No category expenditures loaded.
                     </div>
                  )}
               </div>
            </div>
         </div>
       </div>

      {/* 3. Transaction Ledger Node (Filtered Table) */}
      <section className="space-y-6">
        <div className="border border-border ledger-border bg-card p-4 sm:p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-secondary ledger-border">
                    <History className="h-4 w-4" />
                 </div>
                 <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Transaction Ledger Node</h3>
                    <p className="technical-label opacity-40">
                       {activeFilters ? "Filtering cycle items based on AI diagnostics" : "All cycle transactions synchronised"}
                    </p>
                 </div>
              </div>
              
              {activeFilters && (
                 <MagneticButton 
                   onClick={() => setActiveFilters(null)}
                   variant="outline" 
                   size="sm"
                   strength={0.2}
                   className="text-[9px] font-mono uppercase tracking-widest h-7 border-destructive/30 text-destructive hover:bg-destructive/5 rounded-none text-destructive"
                 >
                    Clear Filters [X]
                 </MagneticButton>
              )}
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px]">
                 <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase text-[8px] tracking-wider">
                       <th className="pb-3">Date</th>
                       <th className="pb-3">Merchant</th>
                       <th className="pb-3">Category</th>
                       <th className="pb-3 text-right">Amount</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border/40">
                    {filteredExpenses.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground uppercase italic">No matching records found in this cycle.</td>
                       </tr>
                    ) : (
                       filteredExpenses.map((tx: any) => {
                          const cat = categories.find((c: any) => c.id === tx.category_id)
                          const amt = parseFloat(tx.amount)
                          return (
                             <tr key={tx.id} className="hover:bg-secondary/10 transition-colors">
                                <td className="py-3 text-muted-foreground">{new Date(tx.date).toLocaleDateString(language, {month: 'short', day: '2-digit'})}</td>
                                <td className="py-3 font-bold uppercase text-foreground max-w-[120px] sm:max-w-none truncate" title={tx.merchant}>{tx.merchant}</td>
                                <td className="py-3">
                                   <span className="px-1.5 py-0.5 bg-secondary/50 border border-border text-[8px] uppercase font-bold tracking-tighter">
                                      {cat?.name || "UNCLASSIFIED"}
                                   </span>
                                </td>
                                <td className={cn("py-3 text-right font-bold", amt > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                                   {amt > 0 ? "+" : ""}{currencySymbol}{amt.toFixed(2)}
                                </td>
                             </tr>
                          )
                       })
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </section>
    </motion.div>
  )
}
