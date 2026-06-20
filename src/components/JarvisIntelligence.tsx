"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, X, ShieldCheck, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface JarvisIntelligenceProps {
  cycleData: any
}

export function JarvisIntelligence({ cycleData }: JarvisIntelligenceProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/analyze-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cycleData)
      })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runAnalysis()
  }, [cycleData.currentBalance]) // Re-run when data changes significantly

  return (
    <div className="w-full border border-border ledger-border bg-white overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar Accent */}
      <div className="w-full md:w-1 bg-foreground hidden md:block" />
      
      <div className="flex-1 p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary ledger-border">
              <Sparkles className="h-4 w-4 text-foreground" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Jarvis // Strategy Node</h3>
              <p className="technical-label opacity-40">Active Analysis Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="technical-label">Status</span>
                <span className={cn(
                  "font-mono text-[10px] font-bold uppercase",
                  analysis?.status === "HEALTHY" ? "text-emerald-600" : 
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
               <div className="flex items-center justify-between pt-4 border-t border-border/50 opacity-30 italic font-mono text-[8px] uppercase">
                  <span>Logic Model: Gemini 2.5 Flash</span>
                  <span>Threat Vector: {analysis.threatLevel}%</span>
               </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
               <button onClick={runAnalysis} className="technical-label hover:text-foreground transition-colors uppercase underline decoration-dashed">
                 Re-initialize JARVIS communication
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
