"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSystem } from "@/lib/SystemContext"

export function IngestSpotlightOverlay() {
  const pathname = usePathname()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [currentPhase, setCurrentPhase] = useState<"nav" | "ingest">("nav")

  const { user } = useSystem()
  const storageKey = user ? `leger_spotlight_dismissed_${user.id}` : "leger_spotlight_dismissed"

  // Check transaction count on mount
  useEffect(() => {
    const checkTxCount = async () => {
      if (pathname === "/login" || pathname === "/signup") return

      try {
        const { data, count, error } = await supabase
          .from("tracker_expense")
          .select("id", { count: "exact" })
          .limit(10)

        const txCount = count !== null ? count : (data?.length || 0)

        // If user has 0 transactions, ALWAYS show spotlight (clear any stale dismissal flag)
        if (!error && txCount === 0) {
          localStorage.removeItem(storageKey)
          setIsVisible(true)
          return
        }

        // If user has between 1 and 4 transactions, respect manual dismissal
        const dismissed = localStorage.getItem(storageKey)
        if (dismissed === "true") return

        if (!error && txCount < 5) {
          setIsVisible(true)
        }
      } catch (e) {
        console.error("Spotlight count check error:", e)
      }
    }

    checkTxCount()
  }, [pathname, storageKey])

  // Smooth scroll target element into view on page change
  useEffect(() => {
    if (!isVisible || pathname !== "/expenses") return

    const timer = setTimeout(() => {
      const el = document.querySelector('[data-tour="ingest-dropzone"]') || document.querySelector('[data-tour="ingest-tab"]')
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isVisible, pathname])

  // Update target rect based on current page and phase
  useEffect(() => {
    if (!isVisible) return

    const updatePosition = () => {
      let element: HTMLElement | null = null

      if (pathname === "/expenses") {
        setCurrentPhase("ingest")
        const tabEl = document.querySelector('[data-tour="ingest-tab"]') as HTMLElement | null
        const dropzoneEl = document.querySelector('[data-tour="ingest-dropzone"]') as HTMLElement | null

        if (dropzoneEl && dropzoneEl.getBoundingClientRect().height > 0 && dropzoneEl.getBoundingClientRect().top < window.innerHeight - 80) {
          // Target the full card container surrounding the dropzone
          element = dropzoneEl.closest('.ledger-border') as HTMLElement || dropzoneEl
        } else {
          element = tabEl || dropzoneEl
        }
      } else {
        setCurrentPhase("nav")
        const isMobile = window.innerWidth < 768
        element = isMobile
          ? (document.querySelector('[data-tour="nav-ledger-mobile"]') || document.querySelector('[data-tour="nav-ledger"]'))
          : (document.querySelector('[data-tour="nav-ledger-icon"]') || document.querySelector('[data-tour="nav-ledger"]'))
      }

      if (element) {
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })
          return
        }
      }

      // Fallback rect if navbar is mounting asynchronously
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768
      if (isMobile && pathname !== "/expenses") {
        const buttonWidth = window.innerWidth / 6
        setTargetRect({
          left: buttonWidth + 8,
          top: window.innerHeight - 52,
          width: buttonWidth,
          height: 48,
        })
      } else if (!isMobile && pathname !== "/expenses") {
        setTargetRect({
          left: 28,
          top: 195,
          width: 24,
          height: 24,
        })
      }
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition)

    const timer = setInterval(updatePosition, 200)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition)
      clearInterval(timer)
    }
  }, [isVisible, pathname])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(storageKey, "true")
  }

  const handleHaloClick = () => {
    if (currentPhase === "nav") {
      router.push("/expenses?tab=ingest")
    }
  }

  if (!isVisible || !targetRect) return null

  const isCircle = currentPhase === "nav" || (targetRect.width < 140 && targetRect.height < 140)

  // Circular bounds for small nav targets
  const isSmallElement = targetRect.width < 250 && targetRect.height < 120
  const circleSize = isSmallElement ? Math.max(Math.min(targetRect.width, targetRect.height) + 24, 52) : 64
  const centerX = targetRect.left + targetRect.width / 2
  const centerY = targetRect.top + targetRect.height / 2
  const haloLeft = centerX - circleSize / 2
  const haloTop = centerY - circleSize / 2

  // Rectangular bounds for statement upload box
  const pad = 6
  const rectLeft = Math.max(4, targetRect.left - pad)
  const rectTop = Math.max(4, targetRect.top - pad)
  const rectWidth = targetRect.width + pad * 2
  const rectHeight = targetRect.height + pad * 2

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999990] pointer-events-none">
        {/* SVG Mask Backdrop — Circular cutout for nav icon, Rectangular cutout for Upload Statement Card Box */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9999991]">
          <defs>
            <mask id="ingest-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {isCircle ? (
                <circle cx={centerX} cy={centerY} r={circleSize / 2} fill="black" />
              ) : (
                <rect x={rectLeft} y={rectTop} width={rectWidth} height={rectHeight} rx={2} fill="black" />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.65)"
            mask="url(#ingest-spotlight-mask)"
            onClick={handleDismiss}
            className="pointer-events-auto cursor-pointer"
          />
        </svg>

        {/* Glowing Beam Frame — Circle for nav icon, Rectangular box wrapping Upload Statement Card */}
        {isCircle ? (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={handleHaloClick}
            style={{
              left: `${haloLeft}px`,
              top: `${haloTop}px`,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
            }}
            className="fixed z-[9999995] rounded-full border-2 border-white/90 shadow-[0_0_24px_rgba(255,255,255,0.7)] bg-transparent transition-all duration-300 flex items-center justify-center pointer-events-auto cursor-pointer"
            title="Click to navigate to Ledger"
          >
            <div className="w-full h-full rounded-full border border-white/50 animate-ping opacity-30 pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            style={{
              left: `${rectLeft}px`,
              top: `${rectTop}px`,
              width: `${rectWidth}px`,
              height: `${rectHeight}px`,
            }}
            className="fixed z-[9999995] rounded-none border-2 border-white/90 shadow-[0_0_28px_rgba(255,255,255,0.75)] bg-transparent transition-all duration-300 pointer-events-none"
          />
        )}

        {/* Floaty Callout Card Window */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={
            isMobile
              ? {
                  left: "16px",
                  right: "16px",
                  top: isCircle
                    ? `${Math.max(16, haloTop - 195)}px`
                    : `${Math.min(window.innerHeight - 160, rectTop + rectHeight + 16)}px`,
                }
              : {
                  left: isCircle
                    ? `${Math.min(window.innerWidth - 340, Math.max(16, haloLeft + circleSize + 28))}px`
                    : `${Math.min(window.innerWidth - 340, Math.max(16, rectLeft + rectWidth + 24))}px`,
                  top: isCircle
                    ? `${Math.max(24, haloTop - 20)}px`
                    : `${Math.max(24, rectTop)}px`,
                }
          }
          className="fixed z-[9999999] pointer-events-auto w-full max-w-[320px] p-4 bg-card border border-border ledger-border font-mono shadow-2xl rounded-none space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              {currentPhase === "nav" ? "Import Statement" : "Upload Statement"}
            </span>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground text-xs p-0.5 cursor-pointer"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs text-foreground/80 font-mono leading-relaxed">
            {currentPhase === "nav"
              ? "We noticed you have fewer than 5 transactions in your ledger. Click the Ledger button to import your bank statement extract."
              : "Upload your PDF, TXT, or CSV statement extract here, or paste extract text below to import your transactions."}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
