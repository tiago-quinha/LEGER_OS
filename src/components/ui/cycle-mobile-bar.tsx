"use client"

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface CycleMobileBarProps {
  cycles: { id: string; label: string }[]
  currentCycleId: string
  route: string
  onCycleChange?: (newCycleId: string) => void
  className?: string
}

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

  const canPrev = currentIndex < cycles.length - 1
  const canNext = currentIndex > 0

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10) } catch {}
    }
  }

  const navigateToCycleIndex = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < cycles.length && targetIndex !== currentIndex) {
      const targetCycle = cycles[targetIndex]
      const dir = targetIndex > currentIndex ? 1 : -1
      setDirection(dir)
      triggerHaptic()
      if (onCycleChange) {
        onCycleChange(targetCycle.id)
      }
    }
  }

  // Dot indicators — chronological order (oldest left, newest right)
  const chronologicalCycles = [...cycles].reverse()
  const activeChronologicalIndex = (cycles.length - 1) - (currentIndex >= 0 ? currentIndex : 0)

  const textVariants = {
    initial: (dir: number) => ({ x: dir > 0 ? -16 : 16, opacity: 0 }),
    animate: { x: 0, opacity: 1, transition: { duration: 0.15, ease: "easeOut" as const } },
    exit: (dir: number) => ({ x: dir > 0 ? 16 : -16, opacity: 0, transition: { duration: 0.12, ease: "easeIn" as const } }),
  }

  return (
    <div
      data-cycle-bar="true"
      className={cn(
        "cycle-mobile-bar md:hidden fixed bottom-14 left-0 right-0 z-40",
        "flex items-center justify-between gap-0",
        "bg-background/90 backdrop-blur-md border-t border-border/60",
        "h-9 px-2 select-none",
        className
      )}
    >
      {/* Left arrow */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex + 1)}
        disabled={!canPrev}
        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all disabled:opacity-20 disabled:active:scale-100 shrink-0"
        aria-label="Previous (older) paycheck cycle"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Center: dots + label */}
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-center overflow-hidden">
        {/* Dots */}
        <div className="flex items-center gap-1 shrink-0">
          {chronologicalCycles.map((c, chronoIdx) => {
            const originalIndex = (cycles.length - 1) - chronoIdx
            const isActive = chronoIdx === activeChronologicalIndex
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => navigateToCycleIndex(originalIndex)}
                layout
                initial={false}
                className={cn(
                  "cursor-pointer rounded-full border-none focus:outline-none transition-colors",
                  isActive ? "bg-foreground" : "bg-muted-foreground/25 hover:bg-muted-foreground/50"
                )}
                animate={{ width: isActive ? 14 : 4, height: 4 }}
                transition={dotTransition}
                aria-label={`Switch to ${c.label}`}
              />
            )
          })}
        </div>

        {/* Animated label */}
        <div className="relative flex items-center justify-center h-4 overflow-hidden min-w-0 flex-1 max-w-[180px]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.span
              key={currentCycle?.id || "cycle-label"}
              custom={direction}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute text-[10px] font-mono font-bold uppercase tracking-tight text-foreground/80 truncate max-w-full text-center whitespace-nowrap"
            >
              {currentCycle?.label?.replace("Cycle: ", "") ?? "—"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex - 1)}
        disabled={!canNext}
        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all disabled:opacity-20 disabled:active:scale-100 shrink-0"
        aria-label="Next (newer) paycheck cycle"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

CycleMobileBar.displayName = "CycleMobileBar"
