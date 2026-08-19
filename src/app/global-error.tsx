"use client"

import React, { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Terminal, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.error("[LEGER_OS Fatal Layout Exception]:", error)

    try {
      if (typeof window !== "undefined") {
        fetch("/api/telemetry/crash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `FATAL_ROOT: ${error.message}`,
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
    const diagnostic = `LEGER_OS Fatal Root Layout Exception Report
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
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#09090b] text-foreground font-sans flex items-center justify-center p-4 sm:p-8 select-none">
        <div className="w-full max-w-xl bg-card border border-border p-6 sm:p-10 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase tracking-[0.2em]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Fatal Root Exception</span>
            </div>
            {error.digest && (
              <span className="text-[9px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border text-muted-foreground">
                Digest: {error.digest.slice(0, 10)}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-foreground">
              Mainframe Layout Crash
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed">
              A critical layout exception occurred at the root application layer. Resetting the session will restore default mainframe state.
            </p>
          </div>

          {/* Error Details */}
          <div className="p-4 bg-background border border-border font-mono text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" /> Crash Details
              </span>
              <button
                type="button"
                onClick={copyDiagnostic}
                className="text-[9px] font-mono uppercase hover:text-foreground text-muted-foreground flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy Diagnostic"}
              </button>
            </div>
            <p className="text-foreground/90 font-medium break-words text-[11px]">
              {error.message || "An unhandled exception halted the application shell."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => reset()}
              className="flex-1 rounded-none uppercase font-mono text-xs tracking-wider h-11 sm:h-12 bg-foreground text-background hover:bg-foreground/90 cursor-pointer font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-Initialize Session
            </Button>
            <Button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/"
                }
              }}
              variant="outline"
              className="rounded-none uppercase font-mono text-xs tracking-wider h-11 sm:h-12 px-6 border-border cursor-pointer"
            >
              Home
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
