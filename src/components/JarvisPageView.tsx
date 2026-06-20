"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, X, ShieldCheck, Sparkles, MessageSquare, RefreshCcw, History, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"

interface JarvisPageViewProps {
  cycleData: any
}

export function LegerPageView({ cycleData }: JarvisPageViewProps) {
  const { profile } = useSystem()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const userName = profile?.username || profile?.full_name || "User"

  // Cache Key grounded in a stable data fingerprint
  const fingerprint = `${Math.round(cycleData.currentBalance)}_${cycleData.categories.length}_${profile?.id || 'guest'}`
  const cacheKey = `leger_insight_${fingerprint}`

  const runAnalysis = async (force = false) => {
    setErrorMessage(null)
    
    // Check cache first if not forced
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          setAnalysis(data)
          setLastUpdated(timestamp)
          return
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/analyze-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentBalance: cycleData.currentBalance,
          velocity: cycleData.velocity,
          categories: cycleData.categories,
          userName: userName
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const timestamp = new Date().toLocaleString()
        setAnalysis(data)
        setLastUpdated(timestamp)
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
    if (profile) runAnalysis()
  }, [cacheKey, !!profile])

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-24 text-foreground w-full">
      {/* 1. Header: The Intelligence Node */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-foreground/10 pb-8 relative">
        <div className="absolute top-0 right-0 technical-label opacity-20 hidden lg:block uppercase tracking-widest text-[9px]">
          NODE_ID: LEGER_CORE_05 // ENCRYPTED
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>Neural Synthesis</span>
            <span className="opacity-30">/</span>
            <span>STRATEGY_NODE</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">
            Leger AI
          </h1>
        </div>

        <Button 
          variant="outline" 
          onClick={() => runAnalysis(true)} 
          disabled={isLoading}
          className="rounded-none font-mono text-[10px] uppercase tracking-widest h-12 px-6 ledger-border hover:bg-secondary"
        >
          <RefreshCcw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} />
          Force Sync
        </Button>
      </header>

      {/* 2. Main Terminal Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Data Telemetry */}
        <div className="lg:col-span-1 space-y-12">
           <div className="space-y-6">
              <h3 className="technical-label border-b border-border pb-2 text-foreground/70">Session Telemetry</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Threat Vector</span>
                    <span className={cn("font-mono text-xs font-bold", (analysis?.threatLevel > 70) ? "text-destructive" : "text-foreground")}>
                       {analysis?.threatLevel || 0}%
                    </span>
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

           <div className="p-6 bg-secondary/10 border border-border ledger-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2 technical-label">
                 <History className="h-3 w-3" />
                 <span>Strategic standing</span>
              </div>
              <div className={cn(
                "p-4 border ledger-border font-mono text-center font-bold tracking-tighter uppercase",
                analysis?.status === "HEALTHY" ? "bg-emerald-500 text-white border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]" :
                analysis?.status === "WATCHING" ? "bg-amber-500 text-white border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
                analysis?.status === "ALERT" ? "bg-destructive text-white border-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
                "bg-muted text-muted-foreground border-border"
              )}>
                {isLoading ? "CALCULATING..." : (analysis?.status || "STANDBY")}
              </div>
           </div>
        </div>

        {/* Right Column: Leger Feed */}
        <div className="lg:col-span-2 space-y-8">
           <div className="min-h-[400px] border border-border ledger-border bg-white relative p-12 flex flex-col justify-between overflow-hidden text-left shadow-xl">
              <div className="absolute top-6 left-6 technical-label opacity-10 uppercase tracking-[0.4em]">Leger_Output_v1.0</div>
              
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                   <div className="relative">
                      <Cpu className="h-16 w-16 text-foreground animate-spin-slow opacity-20" />
                      <Brain className="absolute inset-0 h-16 w-16 text-foreground animate-pulse" />
                   </div>
                   <p className="text-sm font-mono text-muted-foreground animate-pulse uppercase tracking-[0.2em]">Consulting the Leger AI, {userName}...</p>
                </div>
              ) : errorMessage ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                   <AlertTriangle className="h-12 w-12 text-destructive animate-pulse" />
                   <p className="text-lg font-bold tracking-tight text-destructive uppercase max-w-xs">{errorMessage}</p>
                   <Button variant="ghost" onClick={() => runAnalysis(true)} className="technical-label hover:text-foreground underline uppercase">Retry connection</Button>
                </div>
              ) : analysis ? (
                <div className="space-y-12">
                   <div className="flex gap-6">
                      <div className="mt-1 p-2 bg-foreground text-background ledger-border h-fit shrink-0">
                         <MessageSquare className="h-6 w-6" />
                      </div>
                      <div className="space-y-6">
                         <p className="text-2xl font-medium tracking-tight leading-relaxed text-foreground/90">
                           {analysis.message}
                         </p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-border/50">
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 technical-label opacity-60 text-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>Risk Assessment</span>
                         </div>
                         <p className="text-[11px] font-mono text-muted-foreground leading-relaxed uppercase tracking-tighter">
                            {analysis.threatLevel > 50 
                              ? "High spending velocity detected in core nodes. Strategic reallocation recommended to preserve end-cycle liquidity."
                              : "Spending parameters remain within optimal bounds. Current trajectory supports existing lifestyle constraints."}
                         </p>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 technical-label opacity-60 text-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Protocol status</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600">
                            <div className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" />
                            WEALTH_PROTECTION: ACTIVE
                         </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                   <Button onClick={() => runAnalysis()} variant="ghost" className="technical-label uppercase hover:text-foreground tracking-widest">
                      <Zap className="mr-2 h-3.5 w-3.5" /> Initialize Neural Bridge
                   </Button>
                </div>
              )}

              {/* Decorative scanline */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent h-20 w-full -translate-y-full animate-[scan_4s_linear_infinite] pointer-events-none" />
           </div>

           {/* Quick Stats Overlay */}
           <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="p-6 border border-border ledger-border bg-secondary/5 space-y-2">
                 <p className="technical-label text-[8px]">DATA_POINTS</p>
                 <p className="text-xl font-bold font-mono">{cycleData.categories.length}</p>
              </div>
              <div className={cn(
                "p-6 border border-border ledger-border space-y-2",
                cycleData.velocity > 1.0 ? "bg-destructive/5" : "bg-emerald-500/5"
              )}>
                 <p className="technical-label text-[8px]">LOAD_BAL</p>
                 <p className="text-xl font-bold font-mono">{cycleData.velocity > 0 ? ((1/cycleData.velocity)*100).toFixed(0) : 100}%</p>
              </div>
              <div className="p-6 border border-border ledger-border bg-secondary/5 space-y-2">
                 <p className="technical-label text-[8px]">SYS_ARCH</p>
                 <p className="text-xl font-bold font-mono uppercase tracking-tighter">V4_ULTRA</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
