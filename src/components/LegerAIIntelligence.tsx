"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, X, ShieldCheck, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"

interface LegerAIIntelligenceProps {
  cycleData: any
}

export function LegerAIIntelligence({ cycleData }: LegerAIIntelligenceProps) {
  const { profile } = useSystem()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const userName = profile?.username || profile?.full_name || "User"
  
  // Cache Key grounded in a stable data fingerprint
  const fingerprint = `${Math.round(cycleData.currentBalance)}_${cycleData.categories.length}_${profile?.id || 'guest'}`
  const cacheKey = `leger_insight_${fingerprint}`

  const runAnalysis = async (force = false) => {
    // Check cache first if not forced
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data } = JSON.parse(cached)
          setAnalysis(data)
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
          userName
        })
      })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
        const timestamp = new Date().toLocaleString()
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (profile) runAnalysis()
  }, [cacheKey, !!profile]) // Re-run only when cache fingerprint or profile changes

  return (
    <div className="w-full border border-border ledger-border bg-card overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar Accent */}
      <div className="w-full md:w-1 bg-foreground hidden md:block" />
      
      <div className="flex-1 p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary ledger-border">
              <Sparkles className="h-4 w-4 text-foreground" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">LEGER_AI // Strategy Node</h3>
              <p className="technical-label opacity-40">Active Analysis Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="technical-label">Status</span>
                <span className={cn(
                  "font-mono text-[10px] font-bold uppercase",
                  analysis?.status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400 font-bold" : 
                  analysis?.status === "WATCHING" ? "text-amber-600" : "text-destructive"
                )}>
                  {isLoading ? "CALCULATING..." : (analysis?.status || "STANDBY")}
                </span>
             </div>
             <div className="w-32 h-1 bg-secondary ledger-border relative">
                <div 
                  className={cn("h-full transition-all duration-1000", (analysis?.threatLevel > 70) ? "bg-destructive" : "bg-foreground")} 
                  style={{ width: `${analysis?.threatLevel || 0}%` }} 
                />
             </div>
          </div>
        </div>

        <div className="relative min-h-[100px] bg-secondary/10 p-6 ledger-border border-dashed">
          <div className="absolute top-2 right-4 technical-label opacity-10">OUTPUT_FEED</div>
          
          {isLoading ? (
            <div className="flex items-center gap-4 py-4 animate-pulse">
               <Cpu className="h-5 w-5 text-muted-foreground animate-spin" />
               <span className="text-sm font-mono text-muted-foreground italic">Analyzing your movements, Quinha...</span>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
               <div className="flex gap-4">
                  <MessageSquare className="h-5 w-5 text-foreground mt-1 shrink-0" />
                  <p className="text-lg font-bold tracking-tight leading-snug">
                    {analysis.message}
                  </p>
               </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center pt-4 border-t border-border/50">
                   <div className="flex items-center gap-4 text-[8px] font-mono opacity-40 italic uppercase">
                      <span>Model: Gemini 2.5 Flash</span>
                      <span>Threat Vector: {analysis.threatLevel}%</span>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => runAnalysis(true)} 
                        disabled={isLoading}
                        className="technical-label text-[9px] hover:text-foreground underline uppercase flex items-center gap-1 cursor-pointer transition-colors bg-transparent border-0 p-0"
                      >
                         [ RE-RUN SYNC ]
                      </button>
                      <span className="opacity-20 text-[9px] font-mono">/</span>
                      <a 
                        href="/leger-ai" 
                        className="technical-label text-[9px] hover:text-foreground underline uppercase flex items-center gap-1 cursor-pointer transition-colors"
                      >
                         [ OPEN QUERY GATEWAY &gt; ]
                      </a>
                   </div>
                </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
               <button onClick={() => runAnalysis(true)} className="technical-label hover:text-foreground transition-colors uppercase underline decoration-dashed">
                 Re-initialize LEGER_AI communication
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
