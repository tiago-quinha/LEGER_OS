"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Lock, CreditCard, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { getStripe } from "@/lib/stripe-client"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { toast } from "sonner"

interface StripeManageDrawerProps {
  isOpen: boolean
  onClose: () => void
  clientSecret: string
}

function SetupForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsProcessing(true)
    setErrorMessage(null)

    const origin = typeof window !== "undefined" ? window.location.origin : "https://leger-os.vercel.app"

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${origin}/system?payment=updated`,
      },
      redirect: "if_required",
    })

    if (error) {
      setErrorMessage(error.message || "Failed to update payment method")
      setIsProcessing(false)
    } else if (setupIntent && setupIntent.status === "succeeded") {
      toast.success("Payment method updated successfully!")
      setIsProcessing(false)
      onClose()
    } else {
      setIsProcessing(false)
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement
        options={{
          layout: {
            type: "tabs",
            defaultCollapsed: false,
          },
          wallets: {
            link: "never",
            googlePay: "auto",
            applePay: "auto",
          },
          paymentMethodOrder: ["card", "google_pay", "apple_pay", "paypal", "mb_way"],
        }}
      />

      {errorMessage && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-mono">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2.5 pt-2">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full h-10 rounded-none bg-emerald-600 text-white hover:bg-emerald-500 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-sm disabled:opacity-40"
        >
          {isProcessing ? "Updating Method..." : "Save New Payment Method"}
        </Button>

        {/* Official Stripe Standard Compliance Footer */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground/80 select-none">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="uppercase tracking-wider text-[9px]">256-Bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-muted-foreground/70 uppercase tracking-wider text-[9px]">Powered by</span>
            <span className="font-extrabold text-zinc-100 text-[12px] font-sans lowercase tracking-tight leading-none">
              stripe
            </span>
          </div>
        </div>
      </div>
    </form>
  )
}

export function StripeManageDrawer({
  isOpen,
  onClose,
  clientSecret,
}: StripeManageDrawerProps) {
  const { language, currency, formatCurrency, openStripePortal } = useSystem()
  const [activeTab, setActiveTab] = useState<"card" | "portal">("card")

  if (!isOpen) return null

  const stripeLocale = language.startsWith("pt") ? "pt" : "en"

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#10b981", // Emerald 500
      colorBackground: "#09090b", // LEGER_OS Dark Background
      colorText: "#ffffff",
      colorTextSecondary: "#a1a1aa",
      colorDanger: "#ef4444",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      borderRadius: "0px",
      colorIcon: "#10b981",
      spacingGridRow: "10px",
      spacingGridColumn: "10px",
    },
    rules: {
      ".Tab": {
        border: "1px solid #27272a",
        boxShadow: "none",
        borderRadius: "0px",
        padding: "10px 12px",
        backgroundColor: "#09090b",
      },
      ".Tab:hover": {
        border: "1px solid #3f3f46",
      },
      ".Tab--selected": {
        border: "1px solid #10b981 !important",
        backgroundColor: "rgba(16, 185, 129, 0.12) !important",
        boxShadow: "0 0 0 1px #10b981 !important",
      },
      ".TabLabel": {
        color: "#a1a1aa !important",
        fontWeight: "600",
        fontSize: "12px",
      },
      ".TabLabel--selected": {
        color: "#ffffff !important",
        fontWeight: "bold",
        fontSize: "12px",
      },
      ".TabIcon": {
        fill: "#a1a1aa !important",
        color: "#a1a1aa !important",
      },
      ".TabIcon--selected": {
        fill: "#10b981 !important",
        color: "#10b981 !important",
      },
      ".Input": {
        border: "1px solid #27272a",
        borderRadius: "0px",
        backgroundColor: "#09090b",
        color: "#ffffff",
        padding: "10px 12px",
      },
      ".Input:focus": {
        border: "1px solid #10b981",
        boxShadow: "0 0 0 1px #10b981",
      },
      ".Label": {
        fontSize: "11px",
        marginBottom: "4px",
        color: "#f4f4f5",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      },
    },
  }

  const options = {
    clientSecret,
    appearance,
    locale: stripeLocale as any,
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100010] bg-background/80 backdrop-blur-sm flex items-end justify-center font-mono p-0 md:p-6 select-none">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="w-full max-w-lg bg-background border-t md:border border-border text-foreground shadow-2xl flex flex-col overflow-hidden max-h-[92vh]"
        >
          {/* Top Grab Handle on mobile */}
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2 md:hidden" />

          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card/40">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold whitespace-nowrap flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                LEGER_OS // Subscription Management
              </p>
              <p className="text-xs font-bold text-foreground whitespace-nowrap">
                Manage Payment Methods & Invoices
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border bg-card/80 hover:bg-secondary/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Subscription Summary Card */}
          <div className="p-4 bg-emerald-950/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">LEGER_OS PRO Membership</p>
                <p className="text-[10px] text-emerald-400 font-mono">Active Subscription</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">{formatCurrency(4.99)}/mo</p>
              <p className="text-[9px] text-muted-foreground uppercase">Tax Inclusive</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-card/30">
            <button
              onClick={() => setActiveTab("card")}
              className={`flex-1 py-2.5 text-xs font-bold font-mono transition-colors border-b-2 cursor-pointer ${
                activeTab === "card"
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Update Payment Card
            </button>
            <button
              onClick={() => setActiveTab("portal")}
              className={`flex-1 py-2.5 text-xs font-bold font-mono transition-colors border-b-2 cursor-pointer ${
                activeTab === "portal"
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Invoices & Portal
            </button>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5 overflow-y-auto">
            {activeTab === "card" ? (
              clientSecret ? (
                <Elements stripe={getStripe()} options={options}>
                  <SetupForm onClose={onClose} />
                </Elements>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading embedded payment manager...
                </div>
              )
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-3 border border-border bg-card/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Official Stripe Billing Portal</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    View payment history, download official VAT invoices, or change your billing address directly in the Stripe Billing Portal.
                  </p>
                </div>

                <Button
                  onClick={openStripePortal}
                  className="w-full h-10 rounded-none bg-emerald-600 text-white hover:bg-emerald-500 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Stripe Billing & Invoices Portal
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
