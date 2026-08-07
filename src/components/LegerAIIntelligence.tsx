"use client"

import React, { useState, useEffect } from "react"
import { Brain, Cpu, MessageSquare, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"

interface LegerAIIntelligenceProps {
  cycleData: any
}

export function LegerAIIntelligence({ cycleData }: LegerAIIntelligenceProps) {
  const { profile, aiProvider, customApiKey, isPro, setSettingsActiveTab, setSubscriptionOnly, setSettingsOpen } = useSystem()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const userName = profile?.username || profile?.full_name || "User"

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-foreground font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };
  
  // Cache Key grounded in a stable data fingerprint (v3 forces cache-busting for the new prompt format)
  const fingerprint = `${Math.round(cycleData.currentBalance)}_${cycleData.categories.length}_${profile?.id || 'guest'}`
  const cacheKey = `leger_insight_v3_${fingerprint}`

  const runAnalysis = async (force = false) => {
    // Check cache first if not forced
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          
          // Invalidate cache if it is older than 12 hours
          const cacheAgeMs = Date.now() - Number(timestamp)
          if (cacheAgeMs < 12 * 60 * 60 * 1000) {
            setAnalysis(data)
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
           totalIn: cycleData.totalIn,
           totalOut: cycleData.totalOut,
           spendingLimit: cycleData.spendingLimit,
           userName
         })
       })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
        const timestamp = Date.now()
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Read from the cache on fingerprint changes. Do NOT automatically trigger the API.
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        const cacheAgeMs = Date.now() - Number(timestamp)
        if (cacheAgeMs < 12 * 60 * 60 * 1000) {
          setAnalysis(data)
          return
        } else {
          localStorage.removeItem(cacheKey)
        }
      } catch (e) {
        localStorage.removeItem(cacheKey)
      }
    }
    setAnalysis(null)
  }, [cacheKey])

  if (!isPro) {
    return (
      <div 
        onClick={() => {
          setSettingsActiveTab("pro");
          setSubscriptionOnly(true);
          setSettingsOpen(true);
        }}
        className="w-full border border-border bg-card overflow-hidden flex flex-col md:flex-row relative min-h-[140px] items-center justify-center p-8 text-center cursor-pointer hover:bg-emerald-500/[0.01] transition-all duration-300"
      >
        <div className="space-y-2 max-w-md z-10 font-mono">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-4 w-4 text-emerald-500" />
            <p className="font-mono text-[9px] font-bold text-emerald-500 uppercase tracking-widest">LEGER_AI // NEURAL STRATEGY LOCKED</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal uppercase">
            Upgrade to PRO to unlock real-time cycle anomaly synthesis, automated category advisory, and neural cash flow forecasting.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full border border-border bg-card overflow-hidden flex flex-col md:flex-row rounded-lg">
      <div className="flex-1 p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg border border-border">
              <Sparkles className="h-4 w-4 text-foreground" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-sans">Leger AI Strategy Node</h3>
              <p className="text-[9px] uppercase font-sans font-bold text-muted-foreground opacity-60">Active Analysis Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-sans font-bold uppercase text-muted-foreground tracking-wider">Status</span>
                <span className={cn(
                  "font-sans text-[10px] font-bold uppercase",
                  analysis?.status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400" : 
                  analysis?.status === "WATCHING" ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {isLoading ? "Analyzing..." : (analysis?.status || "Idle")}
                </span>
             </div>
          </div>
        </div>

        <div className="relative min-h-[100px] bg-secondary/10 p-6 rounded-lg border border-dashed border-border">
          <div className="absolute top-2 right-4 text-[8px] font-mono opacity-15">OUTPUT_FEED</div>
          
          {isLoading ? (
            <div className="flex items-center gap-4 py-4 animate-pulse">
               <Cpu className="h-5 w-5 text-muted-foreground animate-spin" />
               <span className="text-sm font-mono text-muted-foreground italic">Analyzing your movements, {userName}...</span>
            </div>
          ) : analysis ? (
            <div className="space-y-5">
               <div className="flex gap-3.5 items-start">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="space-y-4 flex-1">
                     <p className="text-sm font-medium text-muted-foreground leading-relaxed tracking-wide">
                       {renderFormattedText(analysis.message)}
                     </p>
                     
                     {analysis.actionItem && (
                       <div className="p-3 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg flex items-start gap-2.5">
                          <Brain className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-mono uppercase font-bold text-amber-500 tracking-wider">Tactical Advisory</p>
                             <p className="text-xs text-foreground font-medium leading-relaxed">
                                {renderFormattedText(analysis.actionItem)}
                             </p>
                          </div>
                       </div>
                     )}

                     {analysis.threatLevel !== undefined && (
                       <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px] font-mono uppercase tracking-wider text-muted-foreground opacity-60">
                             <span>Anomaly Threat Index</span>
                             <span>{analysis.threatLevel}%</span>
                          </div>
                          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                             <div 
                                className={cn(
                                  "h-full transition-all duration-500",
                                  analysis.threatLevel > 70 ? "bg-red-500" :
                                  analysis.threatLevel > 40 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${analysis.threatLevel}%` }}
                             />
                          </div>
                       </div>
                     )}
                  </div>
               </div>
                 <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4 text-[8px] font-mono opacity-40 italic uppercase">
                       <span>Engine: AI Intelligence Node</span>
                    </div>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => runAnalysis(true)} 
                         disabled={isLoading}
                         className="px-3 py-1.5 border border-border bg-secondary hover:bg-secondary/80 text-foreground font-sans text-[9px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                       >
                          Re-run Analysis
                       </button>
                        <button 
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("open-leger-ai"));
                            }
                          }} 
                          className="px-3 py-1.5 border border-border bg-foreground text-background hover:bg-foreground/90 font-sans text-[9px] uppercase font-bold tracking-wider transition-colors cursor-pointer select-none"
                        >
                           Open AI Terminal
                        </button>
                    </div>
                 </div>
             </div>
           ) : (
             <div className="flex items-center justify-center py-6">
                <button 
                  onClick={() => runAnalysis(true)} 
                  className="px-4 py-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground font-sans text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer select-none"
                >
                  Analyze Cycle
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
