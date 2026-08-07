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
      className={cn("relative inline-flex items-center transition-all duration-300 cursor-pointer select-none", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={cn(
        "transition-all duration-300 ease-out block",
        !showValue ? "blur-sm opacity-15 scale-[0.98] pointer-events-none" : "blur-0 opacity-100 scale-100"
      )}>
        {children}
      </span>
      
      <AnimatePresence>
        {!showValue && (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <span className="font-mono text-xs font-bold tracking-widest text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
              ••••••
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
