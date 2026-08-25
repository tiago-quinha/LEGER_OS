"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion"
import { shouldPreventSwipe } from "@/hooks/useCycleSwipe"
import { cn } from "@/lib/utils"

interface SwipeCycleWrapperProps {
  children: React.ReactNode
  cycles: { id: string }[]
  currentCycleId: string
  route: string // e.g. "/categories" or "/budgets"
  onCycleChange?: (newCycleId: string) => void
  className?: string
  disabled?: boolean
}

/**
 * High-performance edge-activated swipe wrapper with clean directional slide animation.
 * Prevents dragging into dark void while providing silky iOS-style spring transitions.
 */
export function SwipeCycleWrapper({
  children,
  cycles,
  currentCycleId,
  route,
  onCycleChange,
  className = "",
  disabled = false,
}: SwipeCycleWrapperProps) {
  const liveDragX = useMotionValue(0)
  const [isSwipingState, setIsSwipingState] = useState(false)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const prevCycleIdRef = useRef(currentCycleId)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontal = useRef<boolean>(false)
  const isTracking = useRef<boolean>(false)

  const isSwipeEnabled = !disabled && Boolean(cycles && cycles.length >= 2)

  const currentIndex = cycles ? cycles.findIndex((c) => c.id === currentCycleId) : -1
  const canPrev = cycles ? currentIndex < cycles.length - 1 : false // Older cycle (swipe right)
  const canNext = cycles ? currentIndex > 0 : false // Newer cycle (swipe left)

  // Track directional change (next vs prev)
  useEffect(() => {
    if (prevCycleIdRef.current !== currentCycleId && cycles && cycles.length > 0) {
      const oldIdx = cycles.findIndex((c) => c.id === prevCycleIdRef.current)
      const newIdx = cycles.findIndex((c) => c.id === currentCycleId)
      if (oldIdx !== -1 && newIdx !== -1) {
        // cycles[0] is newest, cycles[N] is oldest
        // newIdx < oldIdx means moving forward in time -> slide in from right ('next')
        // newIdx > oldIdx means moving backward in time -> slide in from left ('prev')
        setDirection(newIdx < oldIdx ? 'next' : 'prev')
      }
      prevCycleIdRef.current = currentCycleId
    }
  }, [currentCycleId, cycles])

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12)
      } catch {
        // Safe fallback
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSwipeEnabled || e.touches.length > 1) return

    const target = e.target as HTMLElement | Element | null
    if (shouldPreventSwipe(target)) {
      isTracking.current = false
      touchStartX.current = null
      touchStartY.current = null
      return
    }

    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = false
    isTracking.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeEnabled || !isTracking.current || touchStartX.current === null || touchStartY.current === null) return

    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!isHorizontal.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        isHorizontal.current = true
        setIsSwipingState(true)
      } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        isTracking.current = false
        touchStartX.current = null
        touchStartY.current = null
        setIsSwipingState(false)
        animate(liveDragX, 0, { type: "spring", stiffness: 500, damping: 40 })
        return
      }
    }

    if (isHorizontal.current) {
      // Bounded elastic pull: subtle 0.12 resistance (max ~20px) so the page never exposes dark voids
      const maxOffset = 22
      const clampedOffset = Math.sign(dx) * Math.min(maxOffset, Math.abs(dx) * 0.12)
      liveDragX.set(clampedOffset)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTracking.current || touchStartX.current === null) {
      setIsSwipingState(false)
      animate(liveDragX, 0, { type: "spring", stiffness: 480, damping: 36 })
      return
    }

    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const dx = endX - touchStartX.current
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390
    const startX = touchStartX.current

    // Edge activation: swipe must be intentional (>= 45px) and originated from or moved towards the edge
    const minDistance = 45

    if (Math.abs(dx) >= minDistance) {
      // Swiping left (Next / Newer Cycle) -> Requires touch starting on right half or reaching left edge
      if (dx < 0 && canNext) {
        const isEdgeInitiated = startX > windowWidth * 0.5 || endX < windowWidth * 0.45
        if (isEdgeInitiated) {
          triggerHaptic()
          const targetCycle = cycles[currentIndex - 1]
          setDirection('next')
          if (onCycleChange) onCycleChange(targetCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${targetCycle.id}`)
          }
        }
      }
      // Swiping right (Prev / Older Cycle) -> Requires touch starting on left half or reaching right edge
      else if (dx > 0 && canPrev) {
        const isEdgeInitiated = startX < windowWidth * 0.5 || endX > windowWidth * 0.55
        if (isEdgeInitiated) {
          triggerHaptic()
          const targetCycle = cycles[currentIndex + 1]
          setDirection('prev')
          if (onCycleChange) onCycleChange(targetCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${targetCycle.id}`)
          }
        }
      }
    }

    animate(liveDragX, 0, { type: "spring", stiffness: 480, damping: 36 }).then(() => {
      setIsSwipingState(false)
    })

    touchStartX.current = null
    touchStartY.current = null
    isHorizontal.current = false
    isTracking.current = false
  }

  const contentChildren: React.ReactNode[] = []
  const fixedChildren: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement(child) &&
      ((child.type as any)?.displayName === "CycleMobileBar" ||
        (typeof child.type === "function" && ((child.type as any).name === "CycleMobileBar" || (child.type as any).displayName === "CycleMobileBar")))
    ) {
      fixedChildren.push(child)
    } else {
      contentChildren.push(child)
    }
  })

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full touch-pan-y ${className}`}
    >
      <motion.div
        key={currentCycleId}
        initial={{
          x: direction === 'next' ? 24 : -24,
          opacity: 0.88,
        }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 32,
          mass: 0.8,
        }}
        style={{ x: isSwipingState ? liveDragX : 0 }}
        className={cn(
          "w-full",
          isSwipingState && "will-change-transform pointer-events-none select-none"
        )}
      >
        {contentChildren}
      </motion.div>
      {fixedChildren}
    </div>
  )
}

