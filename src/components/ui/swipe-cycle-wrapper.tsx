"use client"

import React, { useRef } from "react"
import { motion, useMotionValue } from "framer-motion"

interface SwipeCycleWrapperProps {
  children: React.ReactNode
  cycles: { id: string }[]
  currentCycleId: string
  route: string // e.g. "/categories" or "/budgets"
  onCycleChange?: (newCycleId: string) => void
  className?: string
}

/**
 * Clean optimistic swipe wrapper.
 * Provides touch drag tracking and optimistic state switching without
 * DOM component unmounting, blur filters, or page flashes.
 */
export function SwipeCycleWrapper({
  children,
  cycles,
  currentCycleId,
  route,
  onCycleChange,
  className = "",
}: SwipeCycleWrapperProps) {
  const x = useMotionValue(0)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isEdgeSwipe = useRef<boolean>(false)
  const isHorizontal = useRef<boolean>(false)
  const isTracking = useRef<boolean>(false)

  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)
  const canPrev = currentIndex < cycles.length - 1 // Older cycle (swipe right)
  const canNext = currentIndex > 0 // Newer cycle (swipe left)

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Fallback
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return
    const startX = e.touches[0].clientX
    touchStartX.current = startX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = false
    isTracking.current = true

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 375
    isEdgeSwipe.current = startX < 35 || startX > screenWidth - 35
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTracking.current || touchStartX.current === null || touchStartY.current === null) return

    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!isHorizontal.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
        isHorizontal.current = true
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        isTracking.current = false
        touchStartX.current = null
        touchStartY.current = null
        x.set(0)
        return
      }
    }

    if (isHorizontal.current) {
      let offset = dx
      if ((dx > 0 && !canPrev) || (dx < 0 && !canNext)) {
        offset = dx * 0.2
      }
      x.set(offset)
    }
  }

  const handleTouchEnd = () => {
    if (!isTracking.current) return

    const currentX = x.get()
    const threshold = isEdgeSwipe.current ? 85 : 35

    if (Math.abs(currentX) >= threshold) {
      if (currentX < 0 && canNext) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex - 1]
        if (onCycleChange) onCycleChange(targetCycle.id)
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `${route}?cycleId=${targetCycle.id}`)
        }
      } else if (currentX > 0 && canPrev) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex + 1]
        if (onCycleChange) onCycleChange(targetCycle.id)
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `${route}?cycleId=${targetCycle.id}`)
        }
      }
    }

    x.set(0)
    touchStartX.current = null
    touchStartY.current = null
    isHorizontal.current = false
    isTracking.current = false
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full touch-pan-y ${className}`}
    >
      <motion.div style={{ x }} transition={{ type: "spring", stiffness: 400, damping: 35 }} className="w-full">
        {children}
      </motion.div>
    </div>
  )
}
