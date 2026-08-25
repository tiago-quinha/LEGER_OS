"use client"

import { useEffect, useRef, useTransition } from "react"
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
 * Supports optimistic client updates (onCycleChange), non-blocking
 * background route updates via useTransition, and haptic feedback.
 */
export function useCycleSwipe({
  cycles,
  currentCycleId,
  route,
  enabled = true,
  onCycleChange,
}: UseCycleSwipeOptions) {
  const router = useRouter()
  const [_, startTransition] = useTransition()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !cycles || cycles.length < 2) return

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

        // 2. Instant URL bar sync without triggering slow Next.js server roundtrips
        if (typeof window !== "undefined") {
          window.history.replaceState(null, '', `${route}?cycleId=${targetCycle.id}`)
        }
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return

      const target = e.target as HTMLElement | Element | null
      if (shouldPreventSwipe(target)) {
        touchStartX.current = null
        touchStartY.current = null
        return
      }

      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current

      // Only trigger for clear horizontal swipes (dx > 45px and dx > dy * 1.4)
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
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
  }, [cycles, currentCycleId, route, router, enabled, onCycleChange, startTransition])
}

/**
 * Helper function to determine if a touch target is part of a scrollable
 * container, form control, chart, dialog/overlay, or other interactive element
 * where horizontal swiping would conflict with native interaction.
 */
export function shouldPreventSwipe(target: HTMLElement | Element | null): boolean {
  if (!target) return false

  // 1. Toast notifications & overlays - NEVER trigger cycle switching
  if (typeof (target as HTMLElement).closest === "function") {
    const htmlEl = target as HTMLElement
    if (
      htmlEl.closest("[data-sonner-toast]") ||
      htmlEl.closest("[data-sonner-toaster]") ||
      htmlEl.closest("[data-toast]") ||
      htmlEl.closest("[role='status']") ||
      htmlEl.closest("[role='alert']") ||
      htmlEl.closest(".sonner-toast") ||
      htmlEl.closest(".toaster") ||
      htmlEl.closest("[data-radix-portal]") ||
      htmlEl.closest("[data-no-swipe='true']") ||
      htmlEl.closest(".no-swipe") ||
      htmlEl.closest("[role='dialog']") ||
      htmlEl.closest("[role='menu']") ||
      htmlEl.closest("[role='listbox']")
    ) {
      return true
    }
  }

  let el: HTMLElement | null = target as HTMLElement
  while (el && el !== document.body && el !== document.documentElement) {
    // Explicit swipe prevention indicators
    if (
      el.getAttribute("data-no-swipe") === "true" ||
      el.classList.contains("no-swipe")
    ) {
      return true
    }

    // Input form controls and slider elements (where user drags to slide)
    const tagName = el.tagName.toLowerCase()
    if (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      tagName === "option" ||
      el.getAttribute("role") === "slider" ||
      el.getAttribute("role") === "switch"
    ) {
      return true
    }

    // Detect horizontal scrollability (e.g., horizontal tag lists or tables)
    const style = window.getComputedStyle(el)
    const overflowX = style.overflowX

    const isScrollableX = (overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 4

    const hasHorizontalOverflowClass = 
      el.className && 
      typeof el.className === "string" && 
      (el.className.includes("overflow-x-auto") || el.className.includes("overflow-x-scroll")) &&
      el.scrollWidth > el.clientWidth + 4

    if (isScrollableX || hasHorizontalOverflowClass) {
      return true
    }

    el = el.parentElement
  }

  return false
}

