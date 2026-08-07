"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Check, X, ShieldAlert, Sparkles, HelpCircle, ArrowRight, CornerDownRight } from "lucide-react"
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
  { id: "missing_features", label: "Missing a specific feature I need" },
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
      <div className="fixed inset-0 z-[100005] bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-mono text-xs select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-lg bg-card border-2 border-border p-6 space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top Lock Badge */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">LEGER_OS // Subscription Gate</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-mono">Step {step} of 3 • Downgrade Review</p>
              </div>
            </div>
            <button 
              onClick={handleKeepPro}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* STEP 1: LOSS AVERSION & FEATURE BREAKDOWN */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold uppercase text-foreground">Are you sure you want to downgrade to Core?</h4>
                <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                  LEGER_OS PRO powers your personal finance mainframe. Downgrading will immediately disable automated bank notifications and neural projections.
                </p>
              </div>

              {/* Loss Warning Box */}
              <div className="p-3.5 bg-destructive/10 border border-destructive/30 space-y-2">
                <span className="text-[9px] font-bold uppercase text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Features You Will Lose Instantly:
                </span>
                <ul className="space-y-1.5 text-[10px] font-mono text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span><strong>Android Push Notification Sync</strong> (MacroDroid real-time bank ingestion)</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span><strong>AI Neural Categorization</strong> (Auto-statement transaction parsing)</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span><strong>Recency-Decay (λ) Forecasts</strong> (Dynamic velocity cash projections)</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span><strong>Conversational AI Overrides</strong> (Natural language budget assumptions)</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  onClick={handleKeepPro}
                  className="w-full h-11 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-lg"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" /> Keep My PRO Benefits ({proPrice.formatted}/mo)
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                  >
                    I still want to proceed to cancellation...
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EXIT SURVEY & DATA COLLECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-foreground">Help us improve LEGER_OS</h4>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Please select the primary reason you are cancelling your PRO node:
                </p>
              </div>

              <div className="space-y-2">
                {CHURN_REASONS.map((item) => {
                  const isSelected = selectedReason === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedReason(item.id)}
                      className={`p-3 border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected ? "bg-foreground/5 border-foreground ring-1 ring-foreground" : "bg-card border-border hover:bg-secondary/20 opacity-80"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-foreground font-bold uppercase">{item.label}</span>
                      <div className={`w-3.5 h-3.5 border flex items-center justify-center ${isSelected ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Optional Textarea */}
              <div className="space-y-1 pt-1">
                <label className="text-[9px] font-mono uppercase font-bold text-muted-foreground">
                  Additional Feedback (Optional):
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what feature or change would have kept you..."
                  rows={2}
                  className="w-full bg-background border border-border p-2 text-xs font-mono text-foreground outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-none h-9 text-[9px] uppercase font-bold w-1/3"
                >
                  Back
                </Button>
                <Button
                  disabled={!selectedReason}
                  onClick={() => setStep(3)}
                  className="rounded-none h-9 text-[9px] uppercase font-bold bg-foreground text-background hover:bg-foreground/90 w-2/3 cursor-pointer"
                >
                  Next: Review Offer <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PSYCHOLOGICAL RETARGETING OFFER */}
          {step === 3 && (
            <div className="space-y-5">
              {(selectedReason === "too_expensive" || selectedReason === "not_using_enough" || !selectedReason) ? (
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/50 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-black font-mono font-bold text-[8px] px-2 py-0.5 uppercase">
                    EXCLUSIVE 50% RETENTION OFFER
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-emerald-500 flex items-center gap-1.5 font-mono">
                      <Sparkles className="h-4 w-4" /> We'd love to keep you on PRO
                    </span>
                    <p className="text-[11px] text-foreground font-sans leading-relaxed">
                      Stay on PRO for <strong>{halfPriceFormatted}/mo</strong> (50% OFF for the next 3 months). Retain all AI push notifications & recency-decay forecasts.
                    </p>
                  </div>

                  <div className="p-2.5 bg-background/60 border border-emerald-500/30 text-[10px] font-mono flex items-center justify-between">
                    <span className="text-muted-foreground uppercase">Regular: <span className="line-through">{proPrice.formatted}/mo</span></span>
                    <span className="font-bold text-emerald-500 text-sm">{halfPriceFormatted} / month</span>
                  </div>

                  <Button
                    disabled={isSubmitting}
                    onClick={handleClaimDiscount}
                    className="w-full h-10 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-md"
                  >
                    {isSubmitting ? "APPLYING..." : `Claim 50% Discount (${halfPriceFormatted}/mo)`}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-primary/10 border-2 border-primary/30 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-foreground text-background font-mono font-bold text-[8px] px-2 py-0.5 uppercase">
                    1 MONTH VIP SUPPORT OFFER
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5 font-mono">
                      <HelpCircle className="h-4 w-4 text-primary" /> Let us help configure your setup
                    </span>
                    <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                      Get <strong>1 month of PRO free</strong> + direct setup assistance for your bank notification push rules and custom category triggers.
                    </p>
                  </div>

                  <Button
                    disabled={isSubmitting}
                    onClick={handleClaimDiscount}
                    className="w-full h-10 rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-md"
                  >
                    {isSubmitting ? "APPLYING..." : "Claim 1 Month Free PRO"}
                  </Button>
                </div>
              )}

              {/* Final Cancel Link */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <Button
                  disabled={isSubmitting}
                  variant="outline"
                  onClick={handleFinalCancel}
                  className="w-full h-9 rounded-none text-[9px] uppercase font-mono font-bold border-destructive text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  {isSubmitting ? "PROCESSING..." : "Decline Offer & Complete Cancellation"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
