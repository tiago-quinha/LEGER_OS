"use client"

import React from "react"
import { Sparkles } from "lucide-react"

export function ClientTrigger() {
  const activateAssistant = () => {
    window.dispatchEvent(new Event("open_leger_assistant"))
  }

  return (
    <div className="pt-4">
      <button 
        onClick={activateAssistant}
        className="w-full h-11 bg-foreground text-background text-xs uppercase font-mono font-bold tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border border-transparent"
      >
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        Activate Assistant
      </button>
    </div>
  )
}
