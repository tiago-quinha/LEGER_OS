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

        // 2. Background URL sync without loading screen flash
        startTransition(() => {
          router.replace(`${route}?cycleId=${targetCycle.id}`, { scroll: false })
        })
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

  // 1. If any modal, dialog, drawer, sheet, popover or dropdown menu is open in the document,
  // we prevent the global swipe cycle switching to avoid conflicts.
  if (typeof document !== "undefined") {
    const activeOverlays = document.querySelectorAll(
      '[role="dialog"], [role="menu"], [role="listbox"], [role="combobox"], [data-radix-portal], .radix-overlay, .radix-themes'
    )
    if (activeOverlays.length > 0) {
      return true
    }
  }

  let el: HTMLElement | null = target as HTMLElement
  while (el && el !== document.body && el !== document.documentElement) {
    // Skip main container layout wrappers so swiping works on general page layout
    if (
      el.id === "main-content" ||
      el.tagName.toLowerCase() === "main" ||
      el.classList.contains("main-content")
    ) {
      el = el.parentElement
      continue
    }

    // Explicit swipe prevention indicators
    if (
      el.getAttribute("data-no-swipe") === "true" ||
      el.classList.contains("no-swipe") ||
      el.classList.contains("recharts-wrapper") ||
      el.classList.contains("recharts-responsive-container")
    ) {
      return true
    }

    // Input form controls and slider elements
    const tagName = el.tagName.toLowerCase()
    if (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      tagName === "button" ||
      tagName === "option" ||
      el.getAttribute("role") === "slider" ||
      el.getAttribute("role") === "button"
    ) {
      return true
    }

    // Detect scrollability: horizontal scrolling containers
    const style = window.getComputedStyle(el)
    const overflowX = style.overflowX
    const overflowY = style.overflowY

    // If styling explicitly enables auto/scroll on overflow and content overflows
    const isScrollableX = (overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth
    const isScrollableY = (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight

    // Check for common Tailwind overflow scroll classes as a fallback
    const hasOverflowClass = 
      el.className && 
      typeof el.className === "string" && 
      (el.className.includes("overflow-x-auto") || 
       el.className.includes("overflow-x-scroll") ||
       el.className.includes("overflow-y-auto") || 
       el.className.includes("overflow-y-scroll"))

    if (isScrollableX || isScrollableY || hasOverflowClass) {
      return true
    }

    el = el.parentElement
  }

  return false
}

