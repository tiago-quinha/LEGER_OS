"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { MessageSquare, X, Send, Check, Sparkles, Terminal, FileText, Bug, Lightbulb, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSystem } from "@/lib/SystemContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const FEEDBACK_CATEGORIES = [
  { id: "bank_parsing", label: "Bank Statement Parsing Glitch", icon: FileText },
  { id: "bug_layout", label: "Bug / Broken Layout", icon: Bug },
  { id: "feature_request", label: "Feature Request / Broker Integration", icon: Lightbulb },
  { id: "general", label: "General Feedback & Suggestions", icon: MessageSquare },
]

interface FeedbackDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialCategory?: string
  initialContext?: string
}

export function FeedbackDrawer({
  isOpen,
  onClose,
  initialCategory = "general",
  initialContext = "",
}: FeedbackDrawerProps) {
  const dragControls = useDragControls()
  const { user, profile, systemLatency, nodeStatus } = useSystem()

  const [category, setCategory] = useState(initialCategory)
  const [message, setMessage] = useState(initialContext)
  const [includeTelemetry, setIncludeTelemetry] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory)
    if (initialContext) setMessage(initialContext)
  }, [initialCategory, initialContext, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error("Please provide a short description")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Transmitting feedback report...")

    try {
      const telemetryData = includeTelemetry ? {
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        screenSize: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
        cycleMode: profile?.paycheck_frequency || "monthly",
        currency: profile?.currency || "EUR",
        tier: profile?.subscription_tier || "FREE",
        latency: `${systemLatency}ms`,
        status: nodeStatus,
      } : null

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          includeTelemetry,
          telemetryData,
        }),
      })

      const data = await res.json()
      toast.dismiss(toastId)

      if (res.ok && data.success) {
        toast.success(data.message || "Feedback report transmitted successfully!")
        setMessage("")
        onClose()
      } else {
        toast.error(data.error || "Failed to submit feedback report")
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message || "Network error submitting feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100002] overflow-hidden pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
          />

          {/* Native Draggable Bottom Drawer (Invariant #14) */}
          <motion.div
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 80 || info.velocity.y > 250) {
                onClose()
              }
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="absolute pointer-events-auto bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 w-full sm:w-[540px] md:w-[600px] max-h-[90vh] bg-[#09090b] border-t sm:border border-border shadow-2xl flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl font-mono text-xs z-[100003]"
          >
            {/* Drag Handle Bar (Invariant #14) */}
            <div
              className="w-full flex justify-center py-2.5 cursor-grab active:cursor-grabbing border-b border-border/40 select-none shrink-0 bg-secondary/15 hover:bg-secondary/30 transition-colors touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5 text-foreground" />
                  <span>Feedback & Anomaly Report</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-foreground">
                  Submit Direct Feedback
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Category Selector */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  Report Category
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                          "p-2.5 border text-left flex items-center gap-2.5 transition-all select-none cursor-pointer",
                          isSelected
                            ? "bg-foreground/10 border-foreground text-foreground shadow-xs ring-1 ring-foreground"
                            : "bg-card border-border/80 text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} />
                        <span className="text-[10px] font-mono uppercase font-bold truncate leading-tight">
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message Box */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-message" className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  Description & Context
                </Label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === "bank_parsing"
                      ? "Paste the raw extract header or merchant text that failed to parse correctly (redact account numbers)..."
                      : category === "feature_request"
                      ? "Describe the broker integration, chart feature, or calculation standard you'd like to see..."
                      : "Describe the issue, what happened, and what you expected to see..."
                  }
                  className="w-full bg-card/80 border border-border rounded-none p-3 text-xs font-sans text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground resize-none leading-relaxed"
                />
              </div>

              {/* Telemetry Checkbox */}
              <div
                onClick={() => setIncludeTelemetry(!includeTelemetry)}
                className="p-3 bg-secondary/15 border border-border flex items-start gap-3 cursor-pointer select-none"
              >
                <div
                  className={cn(
                    "w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5",
                    includeTelemetry ? "bg-foreground text-background border-foreground" : "border-border bg-background"
                  )}
                >
                  {includeTelemetry && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5 font-sans">
                  <p className="text-[11px] font-bold text-foreground">
                    Attach Anonymous System Context
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Includes current route, screen dimensions, active cycle cadence, and system response latency to assist debugging.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2.5 pt-1">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="rounded-none uppercase font-mono text-[10px] tracking-wider h-11 px-5 border-border cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-none uppercase font-mono text-[10px] font-bold tracking-wider h-11 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Transmitting..." : "Transmit Feedback Report"}</span>
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
