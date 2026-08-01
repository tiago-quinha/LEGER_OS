"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { Sparkles, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"

interface SystemSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SystemSettingsModal({ open, onOpenChange }: SystemSettingsModalProps) {
  const { currencySymbol, isPro, upgradeToPro, cancelPro, setSubscriptionOnly } = useSystem()

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setSubscriptionOnly(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border border-border rounded-none p-3 sm:p-6 md:p-8 font-mono text-xs w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl shadow-2xl">
        <DialogHeader className="border-b border-border pb-4 mb-4 sm:mb-6 pr-8 sm:pr-10">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-xs sm:text-base font-bold uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">LEGER_OS // PRO Subscription</span>
            </DialogTitle>
            <GlowingBadge variant={isPro ? "success" : "neutral"} pulse={isPro} dot={true} className="text-[8px] sm:text-[9px] shrink-0">
              {isPro ? "PRO_ACTIVE" : "CORE_FREE"}
            </GlowingBadge>
          </div>
          <DialogDescription className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Unlock the autonomous forecasting engine, automated statement sync, and neural analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-500">
                <Sparkles className="h-4 w-4" /> LEGER_OS // PRO TIER ACCESS
              </h4>
              <span className={cn("px-2 py-0.5 text-[9px] font-mono uppercase font-bold border", isPro ? "bg-emerald-500 text-black border-emerald-500" : "bg-background text-muted-foreground border-border")}>
                {isPro ? "STATUS: PRO ACTIVE" : "STATUS: CORE FREE"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              LEGER_OS is designed with a forever-free Core Base so anyone can master their daily cash flow. Upgrade to PRO to unlock automated bank push notification synchronization, neural categorization, and advanced Monte Carlo predictive analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CORE PLAN CARD */}
            <div className="p-5 bg-card border border-border space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm uppercase text-foreground">LEGER_OS CORE</h5>
                    <p className="text-[10px] text-muted-foreground font-mono">Free Forever Base Tier</p>
                  </div>
                  <span className="text-lg font-bold font-mono text-foreground">{currencySymbol}0<span className="text-xs text-muted-foreground">/mo</span></span>
                </div>
                <ul className="space-y-2 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Manual Expense & Income Tracking</li>
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Paycheck Cycle & Budget Matrices</li>
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Full Multi-Currency & Language Support</li>
                  <li className="flex items-center gap-2 opacity-50"><X className="h-3.5 w-3.5 text-destructive shrink-0" /> Automated Bank Push Notification Sync</li>
                  <li className="flex items-center gap-2 opacity-50"><X className="h-3.5 w-3.5 text-destructive shrink-0" /> Built-in Gemini 2.5 Pro Neural Categorization</li>
                  <li className="flex items-center gap-2 opacity-50"><X className="h-3.5 w-3.5 text-destructive shrink-0" /> Advanced Recency Decay & Monte Carlo Forecasts</li>
                </ul>
              </div>
              <Button 
                disabled={!isPro} 
                variant="outline" 
                onClick={cancelPro}
                className="w-full rounded-none font-mono text-xs uppercase h-9 border-destructive text-destructive hover:bg-destructive/10"
              >
                {!isPro ? "Current Active Plan" : "Cancel PRO Subscription"}
              </Button>
            </div>

            {/* PRO PLAN CARD */}
            <div className="p-5 bg-card border-2 border-emerald-500/50 space-y-4 flex flex-col justify-between relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 right-0 bg-emerald-500 text-black font-mono font-bold text-[9px] px-3 py-0.5 uppercase tracking-tighter">
                RECOMMENDED
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm uppercase text-foreground flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-500" /> LEGER_OS PRO</h5>
                    <p className="text-[10px] text-emerald-500 font-mono">Autonomous Financial Mainframe</p>
                  </div>
                  <span className="text-lg font-bold font-mono text-foreground">{currencySymbol}4.99<span className="text-xs text-muted-foreground">/mo</span></span>
                </div>
                <ul className="space-y-2 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Everything in Core Plan</li>
                  <li className="flex items-center gap-2 text-foreground font-bold"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Native Android Bank Push Notification Sync</li>
                  <li className="flex items-center gap-2 text-foreground font-bold"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Built-in Gemini 2.5 Pro Neural Categorization</li>
                  <li className="flex items-center gap-2 text-foreground font-bold"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Recency Decay & Monte Carlo Simulation Engine</li>
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Forensic Subscription & Anomaly Audit</li>
                  <li className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Unlimited Automated Statement Ingestions</li>
                </ul>
              </div>
              <Button 
                onClick={upgradeToPro}
                disabled={isPro}
                className="w-full rounded-none font-mono text-xs uppercase font-bold h-9 bg-emerald-500 text-black hover:bg-emerald-400 transition-all shadow-[0_0_10px_#10b981]"
              >
                {isPro ? "PRO Access Active" : "Upgrade to PRO (€4.99/mo)"}
              </Button>
              {!isPro && (
                <p className="text-[8px] text-muted-foreground font-mono text-center tracking-normal leading-relaxed mt-1.5">
                  Billing automatically renews monthly. Cancel anytime in System Configuration settings.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
