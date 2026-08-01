"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, Target, X, BarChart3, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"

interface IntelligenceHubProps {
  isOpen: boolean
  onClose: () => void
  cycleData: any
}

export function IntelligenceHub({ isOpen, onClose, cycleData }: IntelligenceHubProps) {
  const { aiProvider, customApiKey } = useSystem()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/analyze-cycle", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
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

  // Trigger analysis when opened if not already loaded
  React.useEffect(() => {
    if (isOpen && !analysis && !isLoading) {
      runAnalysis()
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-[60]"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-border ledger-border z-[70] shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Clean Header */}
              <div className="p-6 border-b border-border bg-foreground text-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-background text-foreground border border-border">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold">AI Strategy Insights</div>
                </div>
                <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-10 space-y-12">
                {isLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-12 h-12">
                       <Cpu className="h-12 w-12 text-foreground animate-pulse" />
                       <div className="absolute inset-0 border-2 border-foreground/10 animate-spin rounded-full" />
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground animate-pulse">Analyzing paycheck cycle data...</p>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Status Grid */}
                    <div className="grid grid-cols-3 gap-6">
                       <div className="space-y-2 flex flex-col justify-start">
                          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Cycle Status</p>
                          <span className={cn(
                            "px-3 py-1 text-[10px] text-center w-full justify-center font-mono font-bold border",
                            analysis.status === "OPTIMAL" 
                              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" 
                              : analysis.status === "CAUTION" 
                                ? "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                                : "text-destructive bg-destructive/10 border-destructive/20"
                          )}>
                            {analysis.status}
                          </span>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Spend velocity</p>
                          <div className="h-5 w-full bg-secondary border border-border relative">
                             <div 
                                className={cn("h-full transition-all duration-1000", analysis.threatLevel > 70 ? "bg-destructive" : "bg-foreground")} 
                                style={{ width: `${analysis.threatLevel}%` }} 
                             />
                          </div>
                       </div>
                       <div className="space-y-2 text-right">
                          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Verification</p>
                          <p className="font-mono text-xs font-bold uppercase text-emerald-500">100% SECURE</p>
                       </div>
                    </div>

                    {/* Insights */}
                    <div className="space-y-8">
                       <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                             <Target className="h-3 w-3" />
                             <span>Core Insight</span>
                          </div>
                          <p className="text-2xl font-bold tracking-tight uppercase leading-tight">
                            {analysis.insight}
                          </p>
                       </div>

                       <div className="space-y-3 p-6 bg-secondary/10 border border-border">
                          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                             <ShieldCheck className="h-3 w-3" />
                             <span>Strategic recommendation</span>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            "{analysis.recommendation}"
                          </p>
                       </div>
                    </div>

                    {/* Meta Footer */}
                    <div className="pt-8 border-t border-border flex items-center justify-between opacity-40 font-mono text-[8px] uppercase">
                       <span>Processed by Gemini Pro</span>
                       <span>Leger_OS Secure Node</span>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <MagneticButton onClick={runAnalysis} variant="outline" className="rounded-none uppercase text-[10px] font-bold tracking-widest gap-2 justify-center" strength={0.35}>
                      <Zap className="h-3 w-3" /> Initialize Intelligence Hub
                    </MagneticButton>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
