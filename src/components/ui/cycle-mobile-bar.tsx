"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface CycleMobileBarProps {
  cycles: { id: string; label: string }[]
  currentCycleId: string
  route: string // e.g. "/categories" or "/budgets"
  onCycleChange?: (newCycleId: string) => void
  className?: string
}

/**
 * Sticky bottom cycle navigation bar shown only on mobile (md:hidden).
 * Sits above the mobile nav bar (bottom-16 to clear the 64px nav).
 *
 * Chronological order:
 * Left arrow (←)  : Navigate to older cycle (timeline left)
 * Right arrow (→) : Navigate to newer cycle (timeline right)
 * Indicator dots : Chronological order from Oldest (Left) to Newest (Right)
 */
export function CycleMobileBar({
  cycles,
  currentCycleId,
  route,
  onCycleChange,
  className,
}: CycleMobileBarProps) {
  const router = useRouter()
  const [direction, setDirection] = useState<number>(0)

  if (cycles.length < 2) return null

  // cycles array is usually sorted newest first (cycles[0] = newest).
  // Chronological timeline order (Oldest -> Newest):
  // Reverse index: chronologicalIndex = (cycles.length - 1) - currentIndex
  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)
  const currentCycle = cycles[currentIndex]

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
      const dir = targetIndex > currentIndex ? 1 : -1 // 1 = older, -1 = newer
      setDirection(dir)
      triggerHaptic()
      if (onCycleChange) {
        onCycleChange(targetCycle.id)
      }

      // For Dashboard (route === "/"), fetch new cycle data from server via router.push
      if (route === "/") {
        router.push(`/?cycleId=${targetCycle.id}`)
      } else if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `${route}?cycleId=${targetCycle.id}`)
      }
    }
  }

  // Display dots in chronological order: Oldest (left) -> Newest (right)
  // Oldest cycle is at index (cycles.length - 1)
  const chronologicalCycles = [...cycles].reverse()
  const activeChronologicalIndex = (cycles.length - 1) - currentIndex

  return (
    <div
      className={cn(
        "md:hidden fixed bottom-16 left-0 right-0 z-40",
        "flex items-center justify-between",
        "bg-background/90 backdrop-blur-xl border-t border-border/80",
        "px-4 py-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out",
        className
      )}
    >
      {/* Left Arrow: Go to Older Cycle */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex + 1)}
        disabled={!canPrev}
        className="h-10 w-10 flex items-center justify-center border border-border/80 bg-card/80 hover:bg-secondary active:scale-90 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 rounded-md"
        aria-label="Previous (older) paycheck cycle"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 px-3 overflow-hidden h-11">
        <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/80">
          Paycheck Cycle
        </span>

        {/* Clean Cycle Label */}
        <div className="relative w-full flex justify-center items-center h-4 overflow-hidden">
          <span className="text-[11px] font-mono font-bold uppercase tracking-tight text-foreground truncate max-w-full text-center">
            {currentCycle?.label?.replace("Cycle: ", "") ?? "—"}
          </span>
        </div>

        {/* Chronological Indicator Dots: Oldest (Left) -> Newest (Right) */}
        <div className="flex items-center gap-1.5 mt-1">
          {chronologicalCycles.map((c, chronoIdx) => {
            const originalIndex = (cycles.length - 1) - chronoIdx
            const isActive = chronoIdx === activeChronologicalIndex
            return (
              <button
                key={c.id}
                onClick={() => navigateToCycleIndex(originalIndex)}
                className="p-1 focus:outline-none cursor-pointer"
                aria-label={`Switch to ${c.label}`}
              >
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    isActive
                      ? "w-5 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Arrow: Go to Newer Cycle */}
      <button
        onClick={() => navigateToCycleIndex(currentIndex - 1)}
        disabled={!canNext}
        className="h-10 w-10 flex items-center justify-center border border-border/80 bg-card/80 hover:bg-secondary active:scale-90 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 rounded-md"
        aria-label="Next (newer) paycheck cycle"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  )
}
