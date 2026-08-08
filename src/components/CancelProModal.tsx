"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Sparkles, ArrowRight, ArrowLeft, Minus, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { getProPrice } from "@/lib/format"
import { toast } from "sonner"

interface CancelProModalProps {
  isOpen: boolean
  onClose: () => void
}

const CHURN_REASONS = [
  { id: "too_expensive", label: "Price is too high for my budget" },
  { id: "not_using_enough", label: "I don't use push sync or forecasts enough" },
  { id: "technical_issue", label: "Setup difficulty or technical bug" },
  { id: "missing_features", label: "Missing a feature I need" },
  { id: "other", label: "Other reason" },
]

const LOST_FEATURES = [
  { label: "Real-Time Android Push Sync", sub: "We won't be able to auto-import your bank notifications anymore." },
  { label: "AI Neural Statement Parsing", sub: "Your statements and receipts won't be parsed automatically." },
  { label: "Recency-Decay (λ) Forecasts", sub: "Your cash flow predictions will go back to basic static averages." },
  { label: "Conversational AI Overrides", sub: "Your AI forecast assumptions will stop applying." },
]

export function CancelProModal({ isOpen, onClose }: CancelProModalProps) {
  const { cancelPro, claimProDiscount, currency, profile } = useSystem()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedReason, setSelectedReason] = useState<string>("")
  const [feedbackText, setFeedbackText] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const proPrice = getProPrice(currency)
  const fullAmount = parseFloat(proPrice.amount)
  const halfPriceAmount = (fullAmount / 2).toFixed(2)
  const halfPriceFormatted = `${proPrice.symbol}${halfPriceAmount}`
  const totalSavedFormatted = `${proPrice.symbol}${(fullAmount * 1.5).toFixed(2)}`

  if (!isOpen) return null

  const reset = () => {
    setStep(1)
    setSelectedReason("")
    setFeedbackText("")
  }

  const handleKeepPro = () => { reset(); onClose() }

  const handleClaimDiscount = async () => {
    setIsSubmitting(true)
    try {
      await claimProDiscount()
      reset()
      onClose()
    } catch {
      toast.error("Failed to claim discount")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalCancel = async () => {
    setIsSubmitting(true)
    try {
      await cancelPro({ reason: selectedReason || "unspecified", feedback: feedbackText || "" })
      reset()
      onClose()
    } catch {
      toast.error("Failed to cancel subscription")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasClaimedDiscount = !!profile?.ai_journal?.retention_discount_claimed_at
  const isTechnicalReason = selectedReason === "missing_features" || selectedReason === "technical_issue"

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100005] bg-background w-full h-full flex flex-col overflow-hidden select-none font-mono">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden"
        >

          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-card/40">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Subscription Control Node
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <span className={step === s ? "text-foreground font-bold" : ""}>
                      {s === 1 ? "1. Lost Access" : s === 2 ? "2. Reason" : "3. Offer & Action"}
                    </span>
                    {s < 3 && <Minus className="h-2.5 w-2.5 opacity-30" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <button
              onClick={handleKeepPro}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border bg-card/80 hover:bg-secondary/40"
              title="Close and stay on PRO"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-8">
            <div className="w-full max-w-sm space-y-6">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                      We'd hate to see you go
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Downgrading to Core Base immediately stops automated ingestion and predictive intelligence ({proPrice.formatted}/mo).
                    </p>
                  </div>

                  <div className="divide-y divide-border border border-border bg-card/30">
                    {LOST_FEATURES.map((f) => (
                      <div key={f.label} className="flex items-start gap-3 px-4 py-3">
                        <div className="p-1 bg-destructive/10 border border-destructive/20 text-destructive shrink-0 mt-0.5">
                          <X className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{f.label}</p>
                          <p className="text-[11px] text-muted-foreground font-sans mt-0.5 leading-relaxed">{f.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      onClick={handleKeepPro}
                      className="w-full h-11 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      Keep My PRO Access — {proPrice.formatted}/mo
                    </Button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full text-center text-[10px] uppercase text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer py-1"
                    >
                      I still want to downgrade...
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                      Help us understand
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans">
                      What is the primary reason for considering a downgrade?
                    </p>
                  </div>

                  <div className="divide-y divide-border border border-border bg-card/30">
                    {CHURN_REASONS.map((item) => {
                      const isSelected = selectedReason === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedReason(item.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer ${
                            isSelected ? "bg-foreground/5 font-bold text-foreground" : "hover:bg-secondary/30 text-muted-foreground"
                          }`}
                        >
                          <span className="text-xs text-foreground">{item.label}</span>
                          <div className={`w-3.5 h-3.5 border shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-foreground border-foreground text-background" : "border-border"
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground/70">
                      Additional feedback (optional)
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what we could improve..."
                      rows={2}
                      className="w-full bg-card border border-border px-3 py-2.5 text-xs text-foreground outline-none resize-none placeholder:text-muted-foreground/40"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-none h-10 text-xs uppercase w-1/3 cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" /> Back
                    </Button>
                    <Button
                      disabled={!selectedReason}
                      onClick={() => setStep(3)}
                      className="rounded-none h-10 text-xs uppercase font-bold bg-foreground text-background hover:bg-foreground/90 w-2/3 cursor-pointer disabled:opacity-30"
                    >
                      Continue <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <div className="space-y-6">
                  {hasClaimedDiscount ? (
                    /* Returning churner — warm farewell, no discount */
                    <>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                          We understand
                        </h3>
                        <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                          You're always welcome back — no setup required.
                        </p>
                      </div>

                      <div className="divide-y divide-border border border-border bg-card/30">
                        <div className="flex items-start gap-3 px-4 py-3">
                          <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-xs font-sans text-muted-foreground">
                            <strong className="text-foreground font-mono">Transactions & categories</strong> remain available forever on Core.
                          </p>
                        </div>
                        <div className="flex items-start gap-3 px-4 py-3">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-xs font-sans text-muted-foreground">
                            <strong className="text-foreground font-mono">PRO data</strong> (AI insights & forecasts) is retained for <strong className="text-foreground font-mono">90 days</strong> before privacy purge.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Button
                          onClick={handleKeepPro}
                          className="w-full h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Actually, I'll Stay on PRO ({proPrice.formatted}/mo)
                        </Button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleFinalCancel}
                          className="w-full text-center text-[9px] uppercase text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer py-1 disabled:opacity-30"
                        >
                          {isSubmitting ? "Processing..." : "Complete cancellation"}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* First-time churner — one-time 50% discount */
                    <>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                          Exclusive Retargeting Offer
                        </h3>
                        <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                          {isTechnicalReason
                            ? "We're actively improving technical capabilities. Before you go, let us cut your rate:"
                            : "Before you go — we would love to keep you onboard at a reduced rate:"}
                        </p>
                      </div>

                      {/* Offer Details Box */}
                      <div className="border border-emerald-500/40 bg-emerald-500/10 divide-y divide-emerald-500/20">
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-widest">
                              ONE-TIME 50% DISCOUNT
                            </p>
                            <p className="text-xs font-bold text-foreground">
                              Save {totalSavedFormatted} over 3 months
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground line-through">{proPrice.formatted}/mo</p>
                            <p className="text-sm font-bold text-emerald-500">{halfPriceFormatted} / mo</p>
                          </div>
                        </div>

                        <div className="px-4 py-3 text-xs text-foreground font-sans leading-relaxed">
                          {isTechnicalReason
                            ? <>Keep full PRO access for <strong>{halfPriceFormatted}/month</strong> (50% OFF for 3 months) while we ship updates and fixes.</>
                            : <>Keep full PRO access for <strong>{halfPriceFormatted}/month</strong> (50% OFF for 3 months). Retain all push sync, parsing & AI forecasts.</>
                          }
                        </div>
                      </div>

                      {/* Retention Policy Summary */}
                      <div className="divide-y divide-border border border-border bg-card/30 text-xs font-sans text-muted-foreground">
                        <div className="flex items-start gap-3 px-4 py-2.5">
                          <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>Core data (transactions & categories) stays forever.</span>
                        </div>
                        <div className="flex items-start gap-3 px-4 py-2.5">
                          <ShieldAlert className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                          <span>PRO data (AI forecasts & parsed receipts) retained for 90 days.</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Button
                          disabled={isSubmitting}
                          onClick={handleClaimDiscount}
                          className="w-full h-11 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm"
                        >
                          {isSubmitting ? "Applying..." : `Claim 50% Discount (${halfPriceFormatted}/mo)`}
                        </Button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleFinalCancel}
                          className="w-full text-center text-[9px] uppercase text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer py-1 disabled:opacity-30"
                        >
                          {isSubmitting ? "Processing..." : "No thanks, complete cancellation"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
