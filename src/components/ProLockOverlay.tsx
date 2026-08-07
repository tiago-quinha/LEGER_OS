"use client"

import React from "react"
import { motion } from "framer-motion"
import { Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"

interface ProLockOverlayProps {
  title?: string
  description?: string
  className?: string
  compact?: boolean
}

export function ProLockOverlay({ 
  title = "PRO TIER FEATURE", 
  description = "This feature is reserved for LEGER_OS PRO nodes. Upgrade to unlock real-time neural automation and predictive simulations.", 
  className,
  compact = false
}: ProLockOverlayProps) {
  const { setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()

  const handleUpgrade = () => {
    setSettingsActiveTab("pro")
    setSubscriptionOnly(true)
    setSettingsOpen(true)
  }

  if (compact) {
    return (
      <div className={`p-3 bg-emerald-500/10 border border-emerald-500/30 space-y-2 font-mono text-xs ${className || ""}`}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{title}</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
          {description}
        </p>
        <Button
          type="button"
          onClick={handleUpgrade}
          className="w-full rounded-none h-8 bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-[9px] uppercase font-bold tracking-widest cursor-pointer shadow-sm"
        >
          <Sparkles className="h-3 w-3 mr-1" /> Upgrade to PRO (€4.99/mo)
        </Button>
      </div>
    )
  }

  return (
    <div className={`inset-0 bg-card/90 backdrop-blur-md border border-emerald-500/30 p-6 font-mono text-xs flex flex-col items-center justify-center text-center space-y-4 shadow-2xl relative overflow-hidden ${className || ""}`}>
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
        <Lock className="h-6 w-6" />
      </div>

      <div className="space-y-1 max-w-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-xs font-bold text-emerald-500 uppercase tracking-widest">
            {title}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
          {description}
        </p>
      </div>

      <Button
        type="button"
        onClick={handleUpgrade}
        className="h-9 px-6 rounded-none bg-emerald-500 text-black hover:bg-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest shadow-md transition-all cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Upgrade to PRO (€4.99/mo)
      </Button>
    </div>
  )
}
