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
}: SwipeCycleWrapperProps) {
  const router = useRouter()
  const [_, startTransition] = useTransition()
  const x = useMotionValue(0)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontal = useRef<boolean>(false)
  const isTracking = useRef<boolean>(false)

  if (!cycles || cycles.length < 2) {
    return <div className={className}>{children}</div>
  }

  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId)
  const canPrev = currentIndex < cycles.length - 1 // Older cycle (swipe right)
  const canNext = currentIndex > 0 // Newer cycle (swipe left)

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Safe fallback
      }
    }
  }

  const [isSwipingState, setIsSwipingState] = React.useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return

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
    if (!isTracking.current || touchStartX.current === null || touchStartY.current === null) return

    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!isHorizontal.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
        isHorizontal.current = true
        setIsSwipingState(true)
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
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
        offset = dx * 0.25 // Resistance at boundaries
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
    const threshold = 45

    if (Math.abs(currentX) >= threshold) {
      if (currentX < 0 && canNext) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex - 1]
        if (onCycleChange) onCycleChange(targetCycle.id)
        startTransition(() => {
          router.replace(`${route}?cycleId=${targetCycle.id}`, { scroll: false })
        })
      } else if (currentX > 0 && canPrev) {
        triggerHaptic()
        const targetCycle = cycles[currentIndex + 1]
        if (onCycleChange) onCycleChange(targetCycle.id)
        startTransition(() => {
          router.replace(`${route}?cycleId=${targetCycle.id}`, { scroll: false })
        })
      }
    }

    // Smooth spring reset animation
    animate(x, 0, { type: "spring", stiffness: 450, damping: 35 }).then(() => {
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

