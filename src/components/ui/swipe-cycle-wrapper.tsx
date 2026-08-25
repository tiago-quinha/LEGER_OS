"use client"

import React, { useRef, useTransition } from "react"
import { motion, useMotionValue, animate } from "framer-motion"
import { useRouter } from "next/navigation"
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
 * High-performance interactive swipe wrapper with Framer Motion spring physics.
 * Provides live touch drag animation on main content while keeping CycleMobileBar stationary.
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
  const router = useRouter()
  const [_, startTransition] = useTransition()
  const x = useMotionValue(0)
  const [isSwipingState, setIsSwipingState] = React.useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontal = useRef<boolean>(false)
  const isTracking = useRef<boolean>(false)

  const isSwipeEnabled = !disabled && Boolean(cycles && cycles.length >= 2)

  const currentIndex = cycles ? cycles.findIndex((c) => c.id === currentCycleId) : -1
  const canPrev = cycles ? currentIndex < cycles.length - 1 : false // Older cycle (swipe right)
  const canNext = cycles ? currentIndex > 0 : false // Newer cycle (swipe left)

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10)
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
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        isHorizontal.current = true
        setIsSwipingState(true)
      } else if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        isTracking.current = false
        touchStartX.current = null
        touchStartY.current = null
        setIsSwipingState(false)
        animate(x, 0, { type: "spring", stiffness: 500, damping: 40 })
        return
      }
    }

    if (isHorizontal.current) {
      let offset = dx
      if ((dx > 0 && !canPrev) || (dx < 0 && !canNext)) {
        offset = dx * 0.2 // Soft resistance at cycle boundary edges
      }
      x.set(offset)
    }
  }

  const handleTouchEnd = () => {
    if (!isTracking.current) {
      setIsSwipingState(false)
      return
    }

    const currentX = x.get()
    const threshold = 35

    if (Math.abs(currentX) >= threshold) {
      if (currentX < 0 && canNext) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex - 1]
        
        // Fluid kinetic exit -> switch cycle -> enter from opposite edge
        const exitOffset = Math.min(-65, currentX * 1.2)
        animate(x, exitOffset, { duration: 0.09, ease: "easeOut" }).then(() => {
          if (onCycleChange) onCycleChange(targetCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${targetCycle.id}`)
          }
          x.set(55)
          animate(x, 0, { type: "spring", stiffness: 420, damping: 30 }).then(() => {
            setIsSwipingState(false)
          })
        })
      } else if (currentX > 0 && canPrev) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex + 1]
        
        // Fluid kinetic exit -> switch cycle -> enter from opposite edge
        const exitOffset = Math.max(65, currentX * 1.2)
        animate(x, exitOffset, { duration: 0.09, ease: "easeOut" }).then(() => {
          if (onCycleChange) onCycleChange(targetCycle.id)
          if (typeof window !== "undefined") {
            window.history.replaceState(null, '', `${route}?cycleId=${targetCycle.id}`)
          }
          x.set(-55)
          animate(x, 0, { type: "spring", stiffness: 420, damping: 30 }).then(() => {
            setIsSwipingState(false)
          })
        })
      } else {
        // Boundary bounce back
        animate(x, 0, { type: "spring", stiffness: 480, damping: 32 }).then(() => {
          setIsSwipingState(false)
        })
      }
    } else {
      // Sub-threshold spring return
      animate(x, 0, { type: "spring", stiffness: 480, damping: 32 }).then(() => {
        setIsSwipingState(false)
      })
    }

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
        style={{ x }}
        transformTemplate={({ x }) => `translate3d(${x}, 0px, 0px)`}
        className={cn(
          "w-full",
          isSwipingState && "will-change-transform pointer-events-none select-none overflow-x-clip [contain:layout_paint] [backface-visibility:hidden] [transform-style:preserve-3d]"
        )}
      >
        {contentChildren}
      </motion.div>
      {fixedChildren}
    </div>
  )
}

