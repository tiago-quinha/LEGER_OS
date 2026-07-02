"use client"

import React, { useState } from "react"
import { useSystem } from "@/lib/SystemContext"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface PrivacyValueProps {
  children: React.ReactNode
  className?: string
}

export function PrivacyValue({ children, className }: PrivacyValueProps) {
  const { isPrivacyMode } = useSystem()
  const [isHovered, setIsHovered] = useState(false)

  const showValue = !isPrivacyMode || isHovered

  return (
    <span 
      className={cn("relative inline-block transition-all duration-500", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={cn(
        "transition-all duration-700 ease-in-out block",
        !showValue ? "blur-md opacity-20 scale-95 pointer-events-none select-none" : "blur-0 opacity-100 scale-100"
      )}>
        {children}
      </span>
      
      <AnimatePresence>
        {!showValue && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground border border-border font-mono text-[10px] tracking-widest uppercase shadow-sm whitespace-nowrap select-none flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-500 animate-pulse inline-block" />
              ••••••
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      
      {/* Decorative "Scan" light when revealed */}
      {isHovered && isPrivacyMode && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] pointer-events-none" />
      )}
    </span>
  )
}
