"use client"

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface CycleMobileBarProps {
  cycles: { id: string; label: string }[]
  currentCycleId: string
  route: string // e.g. "/categories" or "/budgets" or "/"
  onCycleChange?: (newCycleId: string) => void
  className?: string
}

/**
 * High-performance mobile sticky cycle navigation bar.
 * Sits fixed above the mobile nav bar (bottom-16).
 * Features zero-flash background route syncing via useTransition,
 * haptic touch feedback, and smooth directional label animations.
 */
const dotTransition = {
  type: "spring" as const,
  stiffness: 240,
  damping: 24,
  mass: 1,
}

export function CycleMobileBar({
  cycles,
  currentCycleId,
  route,
  onCycleChange,
  className,
}: CycleMobileBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [direction, setDirection] = useState<number>(0)

  if (!cycles || cycles.length < 2) return null

  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)
  const currentCycle = cycles[currentIndex >= 0 ? currentIndex : 0]

  const canPrev = currentIndex < cycles.length - 1 // Go to older (left arrow)
  const canNext = currentIndex > 0 // Go to newer (right arrow)

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Safe fallback
      }
    }
  }

  const navigateToCycleIndex = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < cycles.length && targetIndex !== currentIndex) {
      const targetCycle = cycles[targetIndex]
      const dir = targetIndex > currentIndex ? 1 : -1 // 1 = older (left), -1 = newer (right)
      setDirection(dir)
      triggerHaptic()

      if (onCycleChange) {
        onCycleChange(targetCycle.id)
      }
    }
  }

  // Display dots in chronological order: Oldest (left) -> Newest (right)
  const chronologicalCycles = [...cycles].reverse()
  const activeChronologicalIndex = (cycles.length - 1) - (currentIndex >= 0 ? currentIndex : 0)

  const textVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? -24 : 24,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.18, ease: "easeOut" as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? 24 : -24,
      opacity: 0,
      transition: { duration: 0.15, ease: "easeIn" as const },
    }),
  }

  return (
    <div
      className={cn(
        "md:hidden fixed bottom-16 left-0 right-0 z-40",
        "flex items-center justify-between",
        "bg-background/95 backdrop-blur-xl border-t border-border/80",
        "px-4 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out select-none",
        className
      )}
    >

      {/* Left Arrow: Go to Older Cycle */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex + 1)}
        disabled={!canPrev}
        className="h-10 w-10 flex items-center justify-center border border-border/80 bg-card/90 hover:bg-secondary active:scale-95 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 rounded-md shadow-sm"
        aria-label="Previous (older) paycheck cycle"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 px-2 overflow-hidden">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">
          Paycheck Cycle
        </span>

        {/* Animated Cycle Label */}
        <div className="relative w-full flex justify-center items-center h-4 overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.span
              key={currentCycle?.id || "cycle-label"}
              custom={direction}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute text-[11px] font-mono font-bold uppercase tracking-tight text-foreground truncate max-w-full text-center"
            >
              {currentCycle?.label?.replace("Cycle: ", "") ?? "—"}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Chronological Indicator Dots: Oldest (Left) -> Newest (Right) */}
        <div className="flex items-center gap-1.5 mt-1 h-5 overflow-hidden">
          {chronologicalCycles.map((c, chronoIdx) => {
            const originalIndex = (cycles.length - 1) - chronoIdx
            const isActive = chronoIdx === activeChronologicalIndex
            const shortLabel = c.label.replace("Cycle: ", "").trim()
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => navigateToCycleIndex(originalIndex)}
                layout
                initial={false}
                className={cn(
                  "flex cursor-pointer select-none items-center justify-center rounded-full border-none focus:outline-none transition-colors duration-150 leading-none",
                  isActive
                    ? "bg-primary text-primary-foreground font-mono font-bold uppercase shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 text-transparent"
                )}
                animate={{
                  width: isActive ? 58 : 6,
                  height: isActive ? 14 : 6,
                }}
                transition={dotTransition}
                aria-label={`Switch to ${c.label}`}
              >
                <motion.span
                  layout
                  initial={false}
                  className="block whitespace-nowrap text-[7px] tracking-tight px-1.5"
                  animate={{
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.8,
                    filter: isActive ? "blur(0px)" : "blur(2px)",
                  }}
                  transition={dotTransition}
                >
                  {shortLabel}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Right Arrow: Go to Newer Cycle */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex - 1)}
        disabled={!canNext}
        className="h-10 w-10 flex items-center justify-center border border-border/80 bg-card/90 hover:bg-secondary active:scale-95 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 rounded-md shadow-sm"
        aria-label="Next (newer) paycheck cycle"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  )
}

CycleMobileBar.displayName = "CycleMobileBar"

