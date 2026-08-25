"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion"
import { shouldPreventSwipe } from "@/hooks/useCycleSwipe"
import { cn } from "@/lib/utils"

interface SwipeCycleWrapperProps {
  children: React.ReactNode
  cycles: { id: string; label?: string; startDate?: string; endDate?: string | null }[]
  currentCycleId: string
  route: string // e.g. "/categories", "/budgets", "/portfolio", "/"
  onCycleChange?: (newCycleId: string) => void
  className?: string
  disabled?: boolean
}

/**
 * High-performance edge-activated peeking carousel wrapper with real-time adjacent cycle previews.
 * Employs hardware-accelerated GPU transforms, spring physics, and peeking indicators.
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
  const [dragOffset, setDragOffset] = useState(0)
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

  const prevCycle = canPrev && cycles ? cycles[currentIndex + 1] : null
  const nextCycle = canNext && cycles ? cycles[currentIndex - 1] : null

  // Track directional change (next vs prev)
  useEffect(() => {
    if (prevCycleIdRef.current !== currentCycleId && cycles && cycles.length > 0) {
      const oldIdx = cycles.findIndex((c) => c.id === prevCycleIdRef.current)
      const newIdx = cycles.findIndex((c) => c.id === currentCycleId)
      if (oldIdx !== -1 && newIdx !== -1) {
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
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        isHorizontal.current = true
        setIsSwipingState(true)
      } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        isTracking.current = false
        touchStartX.current = null
        touchStartY.current = null
        setIsSwipingState(false)
        setDragOffset(0)
        animate(liveDragX, 0, { type: "spring", stiffness: 450, damping: 35 })
        return
      }
    }

    if (isHorizontal.current) {
      // Calibrated rubber-band drag: responsive up to 55px peek
      const maxOffset = 55
      const dampedOffset = Math.sign(dx) * Math.min(maxOffset, Math.abs(dx) * 0.32)
      liveDragX.set(dampedOffset)
      setDragOffset(dampedOffset)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTracking.current || touchStartX.current === null) {
      setIsSwipingState(false)
      setDragOffset(0)
      animate(liveDragX, 0, { type: "spring", stiffness: 450, damping: 35 })
      return
    }

    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const dx = endX - touchStartX.current
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390
    const startX = touchStartX.current

    // Edge activation: threshold 45px or strong edge pull
    const minDistance = 45

    if (Math.abs(dx) >= minDistance) {
      // Swiping left (Next / Newer Cycle)
      if (dx < 0 && canNext && nextCycle) {
        const isEdgeInitiated = startX > windowWidth * 0.45 || endX < windowWidth * 0.5
        if (isEdgeInitiated) {
          triggerHaptic()
          setDirection('next')
          if (onCycleChange) onCycleChange(nextCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${nextCycle.id}`)
          }
        }
      }
      // Swiping right (Prev / Older Cycle)
      else if (dx > 0 && canPrev && prevCycle) {
        const isEdgeInitiated = startX < windowWidth * 0.55 || endX > windowWidth * 0.5
        if (isEdgeInitiated) {
          triggerHaptic()
          setDirection('prev')
          if (onCycleChange) onCycleChange(prevCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${prevCycle.id}`)
          }
        }
      }
    }

    animate(liveDragX, 0, { type: "spring", stiffness: 450, damping: 35 }).then(() => {
      setIsSwipingState(false)
      setDragOffset(0)
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

  // Format short month label for peek badge
  const getCycleShortLabel = (c: any) => {
    if (!c) return ""
    if (c.label) return c.label.replace(/^Cycle:\s*/i, "")
    if (c.startDate) {
      const d = new Date(c.startDate)
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase()
    }
    return "CYCLE"
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full touch-pan-y overflow-x-clip ${className}`}
    >
      {/* 1. Real-Time Peeking Indicators on Left/Right Margins */}
      <AnimatePresence>
        {isSwipingState && dragOffset > 10 && prevCycle && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: Math.min(1, dragOffset / 35), x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed top-24 left-3 z-50 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 bg-background/90 border border-border text-[10px] font-mono font-bold uppercase tracking-widest text-foreground shadow-2xl backdrop-blur-md rounded-none"
          >
            <span>←</span>
            <span className="truncate max-w-[150px]">{getCycleShortLabel(prevCycle)}</span>
          </motion.div>
        )}

        {isSwipingState && dragOffset < -10 && nextCycle && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: Math.min(1, Math.abs(dragOffset) / 35), x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed top-24 right-3 z-50 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 bg-background/90 border border-border text-[10px] font-mono font-bold uppercase tracking-widest text-foreground shadow-2xl backdrop-blur-md rounded-none"
          >
            <span className="truncate max-w-[150px]">{getCycleShortLabel(nextCycle)}</span>
            <span>→</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Active Cycle Content */}
      <motion.div
        key={currentCycleId}
        initial={{
          x: direction === 'next' ? 28 : -28,
          opacity: 0.88,
        }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 380,
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

