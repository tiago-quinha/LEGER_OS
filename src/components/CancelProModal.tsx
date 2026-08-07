"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Check, X, ShieldAlert, Sparkles, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { getProPrice } from "@/lib/format"
import { toast } from "sonner"

interface CancelProModalProps {
  isOpen: boolean
  onClose: () => void
}

const CHURN_REASONS = [
  { id: "too_expensive", label: "Price is too high for my monthly budget" },
  { id: "not_using_enough", label: "I don't use AI push sync or forecasts enough" },
  { id: "technical_issue", label: "Encountered setup difficulty or technical bug" },
  { id: "missing_features", label: "Missing a feature I need" },
  { id: "other", label: "Other reasons" },
]

export function CancelProModal({ isOpen, onClose }: CancelProModalProps) {
  const { cancelPro, claimProDiscount, currency } = useSystem()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedReason, setSelectedReason] = useState<string>("")
  const [feedbackText, setFeedbackText] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const proPrice = getProPrice(currency)
  const halfPriceAmount = (parseFloat(proPrice.amount) / 2).toFixed(2)
  const halfPriceFormatted = `${proPrice.symbol}${halfPriceAmount}`

  if (!isOpen) return null

  const handleKeepPro = () => {
    setStep(1)
    setSelectedReason("")
    setFeedbackText("")
    onClose()
  }

  const handleClaimDiscount = async () => {
    setIsSubmitting(true)
    try {
      await claimProDiscount()
      setStep(1)
      setSelectedReason("")
      setFeedbackText("")
      onClose()
    } catch (e) {
      toast.error("Failed to claim discount")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalCancel = async () => {
    setIsSubmitting(true)
    try {
      await cancelPro({
        reason: selectedReason || "unspecified",
        feedback: feedbackText || ""
      })
      setStep(1)
      setSelectedReason("")
      setFeedbackText("")
      onClose()
    } catch (e) {
      toast.error("Failed to cancel subscription")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100005] bg-background w-full h-full flex flex-col overflow-hidden font-mono text-xs select-none">
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-card/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">LEGER_OS // Subscription Gate</h2>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                  <span className={step === 1 ? "text-foreground font-bold" : ""}>1. Benefits</span>
                  <span>•</span>
                  <span className={step === 2 ? "text-foreground font-bold" : ""}>2. Reason</span>
                  <span>•</span>
                  <span className={step === 3 ? "text-foreground font-bold" : ""}>3. Offer</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleKeepPro}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border bg-card hover:bg-secondary/40"
              title="Close and keep PRO"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6">

              {/* STEP 1: LOSS AVERSION & FEATURE BREAKDOWN */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-bold uppercase text-foreground">We'd hate to see you go</h3>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      If you downgrade to Core, we'll have to turn off your real-time data processing and AI forecasts right away.
                    </p>
                  </div>

                  {/* Minimal Loss List */}
                  <div className="p-4 bg-card border border-border space-y-3 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block border-b border-border/40 pb-2">
                      Here's what you'll lose:
                    </span>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-destructive/10 text-destructive shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">Real-Time Android Push Sync</span>
                          <span className="text-[11px] text-muted-foreground font-sans">We won't be able to auto-import your bank notifications anymore.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-destructive/10 text-destructive shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">AI Neural Statement Parsing</span>
                          <span className="text-[11px] text-muted-foreground font-sans">Your statements and receipts won't be parsed automatically.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-destructive/10 text-destructive shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground block text-xs">Recency-Decay (λ) Forecasts</span>
                          <span className="text-[11px] text-muted-foreground font-sans">Your cash flow predictions will go back to basic static averages.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={handleKeepPro}
                      className="w-full h-12 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-lg"
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> Keep My PRO Benefits ({proPrice.formatted}/mo)
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                      >
                        I still want to downgrade...
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ONE-CLICK EXIT SURVEY */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-1 text-center">
                    <h3 className="text-lg font-bold uppercase text-foreground">Help us understand</h3>
                    <p className="text-xs text-muted-foreground font-sans">
                      What's the main reason you're considering leaving?
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {CHURN_REASONS.map((item) => {
                      const isSelected = selectedReason === item.id
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedReason(item.id)}
                          className={`p-3.5 border cursor-pointer transition-all flex items-center justify-between select-none ${
                            isSelected ? "bg-foreground/5 border-foreground ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-80"
                          }`}
                        >
                          <span className="text-xs font-mono text-foreground font-bold uppercase">{item.label}</span>
                          <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${isSelected ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Optional Feedback */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                      Anything else you'd like us to know? (optional):
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="We're always listening — tell us what you'd change..."
                      rows={2}
                      className="w-full bg-card border border-border p-3 text-xs font-mono text-foreground outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-none h-11 text-xs uppercase font-bold w-1/3"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                    </Button>
                    <Button
                      disabled={!selectedReason}
                      onClick={() => setStep(3)}
                      className="rounded-none h-11 text-xs uppercase font-bold bg-foreground text-background hover:bg-foreground/90 w-2/3 cursor-pointer"
                    >
                      Next Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: EXCLUSIVE RETENTION OFFER */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-1 text-center">
                    <h3 className="text-lg font-bold uppercase text-foreground">We've got something for you</h3>
                    <p className="text-xs text-muted-foreground font-sans">
                      Before you go — we'd love to make this work:
                    </p>
                  </div>

                  <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/50 space-y-4 relative overflow-hidden shadow-lg">
                    <div className="inline-block bg-emerald-500 text-black font-mono font-bold text-[9px] px-2 py-0.5 uppercase">
                      EXCLUSIVE 50% RETENTION DISCOUNT
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm font-bold uppercase text-emerald-500 flex items-center gap-1.5 font-mono">
                        <Sparkles className="h-4 w-4" /> We'll keep you on PRO for {halfPriceFormatted}/mo
                      </span>
                      <p className="text-xs text-foreground font-sans leading-relaxed">
                        {(selectedReason === "missing_features" || selectedReason === "technical_issues")
                          ? <>Stay with us at <strong>{halfPriceFormatted}/month</strong> (50% OFF for 3 months) while we work on improvements. You keep all your existing features.</>
                          : <>Stay with us at <strong>{halfPriceFormatted}/month</strong> (50% OFF for 3 months). You keep all your bank push notifications, statement parsing & forecasts.</>
                        }
                      </p>
                    </div>

                    <div className="p-3 bg-background/80 border border-emerald-500/30 text-xs font-mono flex items-center justify-between">
                      <span className="text-muted-foreground uppercase">Standard: <span className="line-through">{proPrice.formatted}/mo</span></span>
                      <span className="font-bold text-emerald-500 text-base">{halfPriceFormatted} / month</span>
                    </div>

                    <Button
                      disabled={isSubmitting}
                      onClick={handleClaimDiscount}
                      className="w-full h-12 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-md"
                    >
                      {isSubmitting ? "APPLYING..." : `Claim 50% Discount (${halfPriceFormatted}/mo)`}
                    </Button>
                  </div>

                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFinalCancel}
                      className="text-[9px] font-mono uppercase text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-4 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? "processing..." : "No thanks, complete cancellation"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
