import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 pb-24 md:pb-8 w-full animate-pulse">
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <Skeleton className="h-12 w-64" />
        </div>
      </header>

      {/* 2. Primary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A Skeleton */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card flex flex-col justify-between">
            <div className="flex-1 flex items-end justify-between gap-1 pt-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[40%] w-[6%] rounded-sm" style={{ height: `${20 + i * 5}%` }} />
              ))}
            </div>
          </div>
        </section>

        {/* Chart B Skeleton */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card flex flex-col justify-between">
            <div className="flex-1 flex items-end justify-center gap-3 pt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-1 items-end h-full w-[8%] justify-center">
                  <Skeleton className="h-[60%] w-2 bg-emerald-500/20" />
                  <Skeleton className="h-[45%] w-2 bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Key Metrics (Exact 4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* 4. Category Burn Distribution (Exact 3 Columns) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3.5 w-24" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border ledger-border bg-card/40 p-4 md:p-6 space-y-4 min-h-[120px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-1 w-full bg-secondary/50 relative">
                  <Skeleton className="h-full w-[60%]" />
                </div>
                <div className="flex justify-between text-[8px]">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
