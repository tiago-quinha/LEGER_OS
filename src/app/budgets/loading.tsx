import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function BudgetsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 w-full pb-20 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-10 w-64" />
        </div>
      </div>

      {/* Grid Container (Exact 3 Columns) */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10">
        
        {/* Create Target Vector Card Mock */}
        <div className="border-2 border-dashed border-border p-10 flex flex-col items-center justify-center text-center h-full min-h-[220px] rounded-none">
          <Skeleton className="h-8 w-8 rounded-full mb-3" />
          <Skeleton className="h-3.5 w-40 mb-2" />
          <Skeleton className="h-3 w-28" />
        </div>

        {/* 5 Budget Card Skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-none ledger-border p-6 sm:p-8 space-y-4 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-4.5 w-28" />
              </div>
              <Skeleton className="h-7 w-7 rounded-none" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="w-full h-1.5 bg-secondary/30 rounded-none overflow-hidden">
                <Skeleton className="h-full w-[45%]" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border/40 text-[9px] font-mono">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
