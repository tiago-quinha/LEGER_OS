"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface UseCycleSwipeOptions {
  cycles: { id: string }[]
  currentCycleId: string
  route: string // e.g. "/categories" or "/budgets"
  enabled?: boolean
  onCycleChange?: (newCycleId: string) => void
}

/**
 * Clean gesture hook for horizontal swipe cycle switching.
 * Supports optimistic client updates (onCycleChange) and haptic feedback
 * without shifting layout containers off-screen.
 */
export function useCycleSwipe({
  cycles,
  currentCycleId,
  route,
  enabled = true,
  onCycleChange,
}: UseCycleSwipeOptions) {
  const router = useRouter()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || cycles.length < 2) return

    const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)

    const triggerHaptic = () => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(10)
        } catch {
          // Safe fallback
        }
      }
    }

    const navigate = (dir: "prev" | "next") => {
      const targetIndex = dir === "prev" ? currentIndex + 1 : currentIndex - 1
      if (targetIndex >= 0 && targetIndex < cycles.length) {
        const targetCycle = cycles[targetIndex]
        triggerHaptic()

        // 1. Optimistic state update (instant UI reaction)
        if (onCycleChange) {
          onCycleChange(targetCycle.id)
        }

        // 2. URL sync
        router.push(`${route}?cycleId=${targetCycle.id}`, { scroll: false })
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current

      // Only trigger for clear horizontal swipes (dx > 45px and dx > dy * 1.2)
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) {
          navigate("next") // Swipe left -> newer cycle
        } else {
          navigate("prev") // Swipe right -> older cycle
        }
      }

      touchStartX.current = null
      touchStartY.current = null
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [cycles, currentCycleId, route, router, enabled, onCycleChange])
}
