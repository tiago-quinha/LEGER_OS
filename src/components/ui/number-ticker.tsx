"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, useSpring, motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  className?: string
  decimalPlaces?: number
  prefix?: string
  suffix?: string
}

export function NumberTicker({
  value,
  className,
  decimalPlaces = 2,
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  // Split the number into individual digits for the slot machine effect
  const formatNumber = (val: number) => {
    return val.toLocaleString("en-GB", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })
  }

  // Force conversion to number to prevent string toLocaleString formatting bypass
  const numValue = Number(value)
  const digits = formatNumber(isNaN(numValue) ? 0 : numValue).split("")

  return (
    <span className={cn("inline-flex items-baseline overflow-hidden leading-none tabular-nums", className)}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      {digits.map((digit, i) => {
        if (isNaN(parseInt(digit))) {
          return <span key={i} className="align-baseline">{digit}</span>
        }
        return <Digit key={i} digit={digit} />
      })}
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  )
}

function Digit({ digit }: { digit: string }) {
  return (
    <span className="relative h-[1em] w-[0.6em] overflow-hidden inline-block">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: "100%", translateZ: 0 }}
          animate={{ y: "0%", translateZ: 0 }}
          exit={{ y: "-100%", translateZ: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 380, 
            damping: 28,
            mass: 0.6
          }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            willChange: "transform", 
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translate3d(0,0,0)"
          }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
      <span className="invisible">{digit}</span>
    </span>
  )
}
