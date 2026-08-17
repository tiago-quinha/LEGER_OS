"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  ShieldCheck, 
  Flame, 
  ArrowUpRight 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { toast } from "sonner"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"

interface CycleScorecardModalProps {
  isOpen: boolean
  onClose: () => void
  telemetry: any
  cycleTitle?: string
}

export function CycleScorecardModal({
  isOpen,
  onClose,
  telemetry,
  cycleTitle = "CURRENT CYCLE"
}: CycleScorecardModalProps) {
  const { currencySymbol, isPrivacyMode } = useSystem()
  const [hideAmounts, setHideAmounts] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Discipline score calculation based on velocity and budget
  const velocity = parseFloat(telemetry?.velocity || 1.0)
  const netDelta = parseFloat(telemetry?.netDelta || 0)
  const projectedSurplus = parseFloat(telemetry?.projectedSurplus !== undefined ? telemetry.projectedSurplus : netDelta)
  
  // Score: 100 base, penalized if velocity > 1.0 or deficit
  let disciplineScore = 95
  if (velocity > 1.0) disciplineScore = Math.max(50, Math.round(95 - (velocity - 1.0) * 40))
  if (projectedSurplus < 0) disciplineScore = Math.max(40, disciplineScore - 20)

  const isMasked = hideAmounts || isPrivacyMode

  const handleCopy = async () => {
    const text = `⚡ LEGER_OS // PAYCHECK CYCLE SCORECARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Discipline Score: ${disciplineScore}%
📈 Trajectory: ${projectedSurplus >= 0 ? "Surplus Target" : "Deficit Warning"}
${!isMasked ? `💰 Projected Net Cash Flow: ${projectedSurplus >= 0 ? "+" : ""}${currencySymbol}${projectedSurplus.toFixed(2)}` : "💰 Cash Flow: Protected"}
⚡ Spending Velocity: ${velocity.toFixed(2)}x
🛡️ Mainframe Discipline: Maintained
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from LEGER_OS · Personal Finance Mainframe`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Scorecard copied to clipboard!")
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      toast.error("Failed to copy scorecard")
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[#09090b] border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs relative"
        >
          {/* Header Controls */}
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Cycle Scorecard</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHideAmounts(!hideAmounts)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={hideAmounts ? "Show currency amounts" : "Hide currency amounts for sharing"}
              >
                {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Shareable Card Canvas */}
          <div className="p-6 space-y-6 relative overflow-hidden bg-gradient-to-b from-card/30 to-background">
            <ClippedCircle circleClassName="bg-emerald-500/10" circleSize={260} />

            {/* Main Title & Branding */}
            <div className="space-y-1 z-10 relative">
              <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                LEGER_OS // PERFORMANCE SUMMARY
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                {cycleTitle}
              </h2>
            </div>

            {/* Score Big Display */}
            <div className="p-5 bg-card/40 border border-border rounded-xl space-y-2 relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Discipline Rating
                </span>
                <div className="text-4xl font-bold tracking-tighter text-foreground">
                  {disciplineScore}%
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Velocity
                </span>
                <div className={cn(
                  "text-xl font-bold font-mono",
                  velocity <= 1.0 ? "text-emerald-500" : "text-amber-500"
                )}>
                  {velocity.toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 z-10 relative">
              <div className="p-3 bg-secondary/20 border border-border/60 rounded-lg space-y-1">
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                  Projected Surplus
                </span>
                <div className="text-sm font-bold text-foreground">
                  {isMasked ? "••••••" : `${projectedSurplus >= 0 ? "+" : ""}${currencySymbol}${projectedSurplus.toFixed(2)}`}
                </div>
              </div>

              <div className="p-3 bg-secondary/20 border border-border/60 rounded-lg space-y-1">
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                  Discipline Status
                </span>
                <div className="text-sm font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{projectedSurplus >= 0 ? "Target Met" : "Pace Deficit"}</span>
                </div>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[9px] text-muted-foreground/60 z-10 relative">
              <span>LEGER_OS MAINFRAME</span>
              <span className="font-sans">🔒 100% Client-Side Verified</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 h-9 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied to Clipboard" : "Share Scorecard"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer rounded-lg border border-border"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
