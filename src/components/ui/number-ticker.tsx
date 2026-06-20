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

  const digits = formatNumber(value).split("")

  return (
    <span className={cn("inline-flex overflow-hidden leading-none", className)}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      {digits.map((digit, i) => {
        if (isNaN(parseInt(digit))) {
          return <span key={i}>{digit}</span>
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
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
      <span className="invisible">{digit}</span>
    </span>
  )
}
