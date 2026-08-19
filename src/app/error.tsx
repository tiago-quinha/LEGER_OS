"use client"

import React, { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Home, Copy, Check, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/navigation"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Log error to console
    console.error("[LEGER_OS Exception Intercepted]:", error)

    // Non-blocking telemetry dispatch
    try {
      if (typeof window !== "undefined") {
        fetch("/api/telemetry/crash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack?.slice(0, 1000),
            digest: error.digest,
            pathname: window.location.pathname,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {})
      }
    } catch {}
  }, [error])

  const copyDiagnostic = () => {
    const diagnostic = `LEGER_OS Runtime Exception Report
Timestamp: ${new Date().toISOString()}
Message: ${error.message}
Digest: ${error.digest || "N/A"}
Stack:
${error.stack || "No stack trace available"}`

    navigator.clipboard.writeText(diagnostic)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto select-none">
      <div className="w-full bg-card/60 backdrop-blur-md border border-border p-6 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Top Status Eyebrow */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5 text-amber-500 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Session Exception Intercepted</span>
          </div>
          {error.digest && (
            <span className="text-[9px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border text-muted-foreground">
              Digest: {error.digest.slice(0, 10)}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-foreground">
            System State Recovery
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed">
            An unexpected runtime error occurred while executing this view. The session has been safely halted to prevent state corruption.
          </p>
        </div>

        {/* Error Diagnostic Box */}
        <div className="p-3.5 sm:p-4 bg-background/80 border border-border/80 font-mono text-[10px] sm:text-xs text-muted-foreground space-y-2 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" /> Error Log
            </span>
            <button
              type="button"
              onClick={copyDiagnostic}
              className="text-[9px] font-mono uppercase hover:text-foreground text-muted-foreground flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy Diagnostic"}
            </button>
          </div>
          <p className="text-foreground/90 font-medium break-words">
            {error.message || "An unknown client runtime exception occurred."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:flex-1 rounded-none uppercase font-mono text-xs tracking-wider h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-2 font-bold shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </Button>

          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/"
              }
            }}
            variant="outline"
            className="w-full sm:w-auto rounded-none uppercase font-mono text-xs tracking-wider h-11 sm:h-12 px-6 border-border cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="h-3.5 w-3.5" /> Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
