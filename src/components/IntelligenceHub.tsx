"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Cpu, Zap, Target, X, BarChart3, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"

interface IntelligenceHubProps {
  isOpen: boolean
  onClose: () => void
  cycleData: any
}

export function IntelligenceHub({ isOpen, onClose, cycleData }: IntelligenceHubProps) {
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white border border-border ledger-border z-[70] shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Terminal Header */}
              <div className="p-6 border-b border-border bg-foreground text-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-background text-foreground ledger-border">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em]">Intelligence Hub // SYNTHESIS_V1</div>
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
                    <p className="technical-label animate-pulse italic">Accessing Mainframe... Synthesizing Node Data...</p>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Status Matrix */}
                    <div className="grid grid-cols-3 gap-6">
                       <div className="space-y-2 flex flex-col justify-start">
                          <p className="technical-label">SYS_STATUS</p>
                          <GlowingBadge 
                            variant={analysis.status === "OPTIMAL" ? "success" : analysis.status === "CAUTION" ? "warning" : "error"} 
                            pulse 
                            dot
                            className="px-3 py-1 text-[10px] text-center w-full justify-center rounded-none"
                          >
                            {analysis.status}
                          </GlowingBadge>
                       </div>
                       <div className="space-y-2">
                          <p className="technical-label">THREAT_LVL</p>
                          <div className="h-5 w-full bg-secondary ledger-border relative">
                             <div 
                                className={cn("h-full transition-all duration-1000", analysis.threatLevel > 70 ? "bg-destructive" : "bg-foreground")} 
                                style={{ width: `${analysis.threatLevel}%` }} 
                             />
                          </div>
                       </div>
                       <div className="space-y-2 text-right">
                          <p className="technical-label">DATA_NODES</p>
                          <p className="font-mono text-xs font-bold uppercase">VERIFIED // 0x4A</p>
                       </div>
                    </div>

                    {/* Insights */}
                    <div className="space-y-8">
                       <div className="space-y-3">
                          <div className="flex items-center gap-2 technical-label">
                             <Target className="h-3 w-3" />
                             <span>Core Insight</span>
                          </div>
                          <p className="text-2xl font-bold tracking-tight uppercase leading-tight">
                            {analysis.insight}
                          </p>
                       </div>

                       <div className="space-y-3 p-6 bg-secondary/20 border border-border ledger-border border-dashed">
                          <div className="flex items-center gap-2 technical-label">
                             <ShieldCheck className="h-3 w-3" />
                             <span>Strategic recommendation</span>
                          </div>
                          <p className="text-sm font-mono leading-relaxed text-muted-foreground italic">
                            "{analysis.recommendation}"
                          </p>
                       </div>
                    </div>

                    {/* Meta Footer */}
                    <div className="pt-8 border-t border-border flex items-center justify-between opacity-30 italic font-mono text-[8px] uppercase">
                       <span>Processed by Gemini 1.5 Flash</span>
                       <span>Runtime: 842ms // Session: EX-901</span>
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
