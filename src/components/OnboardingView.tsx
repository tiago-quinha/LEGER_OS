"use client"

import React from "react"
import { motion } from "framer-motion"
import { Landmark, Upload, Terminal, Sparkles, ArrowRight, Cpu, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function OnboardingView() {
  const router = useRouter()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-12 max-w-4xl mx-auto">
      {/* Visual Identity Node */}
      <div className="flex flex-col items-center text-center space-y-6">
        <motion.div 
          initial={{ rotate: 0, scale: 0.9 }}
          animate={{ rotate: 45, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="w-20 h-20 bg-foreground flex items-center justify-center ledger-border shadow-2xl"
        >
          <Landmark className="h-10 w-10 text-background -rotate-45" />
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter uppercase leading-tight">Initialize LEGER_OS</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.3em] opacity-60">System Status: Waiting for Data Ingestion</p>
        </div>
      </div>

      {/* Action Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="p-10 border border-border ledger-border bg-card space-y-6 hover:bg-secondary/20 transition-colors group cursor-pointer" onClick={() => router.push('/expenses')}>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-foreground text-background ledger-border">
                <Upload className="h-4 w-4" />
             </div>
             <h3 className="text-sm font-bold uppercase tracking-widest">Upload Ledger</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Import your bank extracts to define your first financial cycle. 
            LEGER_OS will automatically detect your income patterns.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity uppercase">
             Proceed to node_02 <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        <div className="p-10 border border-border ledger-border bg-card space-y-6 hover:bg-secondary/20 transition-colors group cursor-not-allowed opacity-50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-secondary ledger-border">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
             </div>
             <h3 className="text-sm font-bold uppercase tracking-widest">Neural Sync</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Leger AI is standing by. Once your data is ingested, 
            AI-driven strategic wealth analysis will activate.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground uppercase">
             Waiting for uplink...
          </div>
        </div>
      </div>

      {/* System Metadata */}
      <div className="pt-12 border-t border-border w-full flex justify-between items-center opacity-30 italic font-mono text-[9px] uppercase tracking-widest">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Cpu className="h-3 w-3" />
               <span>Kernel_Init: 100%</span>
            </div>
            <div className="flex items-center gap-2">
               <Database className="h-3 w-3" />
               <span>Buffer: Null</span>
            </div>
         </div>
         <span>Build: V4_ULTRA_STABLE</span>
      </div>
    </div>
  )
}
