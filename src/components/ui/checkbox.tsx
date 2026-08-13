"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  id?: string
  disabled?: boolean
  title?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  id,
  disabled = false,
  title,
}: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      title={title}
      disabled={disabled}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={cn(
        "h-4 w-4 shrink-0 rounded-none border border-border/80 flex items-center justify-center transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-foreground/40",
        checked
          ? "bg-foreground text-background border-foreground"
          : "bg-secondary/10 hover:border-foreground/60 hover:bg-secondary/30",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  )
}
