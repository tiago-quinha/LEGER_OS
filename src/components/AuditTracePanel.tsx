"use client"

import React, { useEffect } from "react"
import { useSystem } from "@/lib/SystemContext"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Fingerprint, Database, Info, ExternalLink, ShieldCheck, ArrowLeftRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AuditTracePanelProps {
  expenses: any[]
  categories: any[]
}

export function AuditTracePanel({ expenses, categories }: AuditTracePanelProps) {
  const { isAuditPanelOpen, setAuditPanelOpen, activeTransactionId, setActiveTransactionId, refreshData } = useSystem()

  const activeTx = expenses.find(e => e.id === activeTransactionId)
  
  const flipSign = async () => {
    if (!activeTx) return
    
    const newAmount = -parseFloat(activeTx.amount)
    const { error } = await supabase
      .from("tracker_expense")
      .update({ amount: newAmount })
      .eq("id", activeTx.id)
    
    if (error) {
      toast.error("Failed to flip sign")
      return
    }
    
    toast.success(`Sign flipped! New amount: ${newAmount.toFixed(2)}`)
    refreshData()
  }

  const deleteTx = async () => {
    if (!activeTx) return
    
    const { error } = await supabase
      .from("tracker_expense")
      .delete()
      .eq("id", activeTx.id)
    
    if (error) {
      toast.error("Failed to delete transaction")
      return
    }
    
    toast.success("Transaction deleted")
    setAuditPanelOpen(false)
    setActiveTransactionId(null)
    refreshData()
  }

  if (!activeTx && isAuditPanelOpen) return null

  const category = categories.find(c => c.id === activeTx?.category_id)

  return (
    <AnimatePresence>
      {isAuditPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setAuditPanelOpen(false)
              setActiveTransactionId(null)
            }}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-card border-l border-border z-50 shadow-2xl overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-8 border-b border-border space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 technical-label">
                    <Fingerprint className="h-3 w-3" />
                    <span>Transaction Audit // {activeTx?.id?.toString().slice(0, 8)}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setAuditPanelOpen(false)} className="rounded-none">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter uppercase">{activeTx?.merchant}</h2>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase">
                      {category?.name || "UNCLASSIFIED"}
                    </Badge>
                    <span className={cn("text-xs font-mono font-bold", parseFloat(activeTx?.amount) > 0 ? "text-emerald-600" : "")}>
                      {parseFloat(activeTx?.amount) > 0 ? "+" : ""}€{parseFloat(activeTx?.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Layers */}
              <div className="flex-1 p-8 space-y-12">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 technical-label opacity-60">
                      <Database className="h-3 w-3" />
                      <span>Raw Source Data</span>
                   </div>
                   <div className="bg-secondary/30 p-4 font-mono text-[10px] leading-relaxed break-all border border-border ledger-border">
                      {activeTx?.raw_text || "NO RAW STRING RECORDED"}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 technical-label opacity-60">
                      <Search className="h-3 w-3" />
                      <span>AI Inference Log</span>
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] border-b border-border pb-2">
                         <span className="text-muted-foreground uppercase font-mono">Heuristic Match</span>
                         <span className="font-bold">{activeTx?.merchant ? "94.2%" : "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] border-b border-border pb-2">
                         <span className="text-muted-foreground uppercase font-mono">Category Confidence</span>
                         <span className="text-emerald-600 font-bold">HIGH</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 technical-label opacity-60">
                      <Info className="h-3 w-3" />
                      <span>Metadata context</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border border-border ledger-border space-y-1">
                         <p className="technical-label opacity-40">TIMESTAMP</p>
                         <p className="text-[10px] font-mono font-bold uppercase">{new Date(activeTx?.date).toLocaleDateString()} {new Date(activeTx?.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="p-3 border border-border ledger-border space-y-1">
                         <p className="technical-label opacity-40">NODE_ID</p>
                         <p className="text-[10px] font-mono font-bold uppercase">SANTANDER_MAIN</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-border bg-secondary/10 flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button onClick={flipSign} variant="outline" className="flex-1 rounded-none uppercase text-[9px] font-bold tracking-widest gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                    <ArrowLeftRight className="h-3 w-3" /> Flip Sign (+/-)
                  </Button>
                  <Button onClick={deleteTx} variant="outline" className="flex-1 rounded-none uppercase text-[9px] font-bold tracking-widest gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
                    <Trash2 className="h-3 w-3" /> Delete Entry
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-none uppercase text-[9px] font-bold tracking-widest gap-2">
                    <ShieldCheck className="h-3 w-3" /> Re-Categorize
                  </Button>
                  <Button className="flex-1 rounded-none uppercase text-[9px] font-bold tracking-widest gap-2">
                    <ExternalLink className="h-3 w-3" /> View Trace
                  </Button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
