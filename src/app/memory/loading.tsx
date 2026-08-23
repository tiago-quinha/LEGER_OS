import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain } from "lucide-react"

export default function MemoryLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full animate-fade-in">
      
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            <span>Neural Context Memory</span>
          </div>
          <Skeleton className="h-10 md:h-12 w-64 rounded-none" />
        </div>
      </header>

      {/* Centered Content Column */}
      <div className="max-w-[900px] mx-auto w-full space-y-8 pt-4">

      {/* Mainframe Ingestion Box Skeleton */}
      <div className="p-5 border border-border ledger-border bg-card/60 backdrop-blur-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-none" />
            <Skeleton className="h-5 w-80 rounded-none" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-20 w-full rounded-none" />
        <div className="flex justify-end">
          <Skeleton className="h-8 w-32 rounded-none" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/30">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-none shrink-0" />
        ))}
      </div>

      {/* Memory Timeline List Skeleton */}
      <div className="space-y-8">
        {/* Group 1 (Today) */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4.5 w-16 rounded-none shrink-0" />
            <div className="h-px bg-border/40 flex-grow" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 border border-border bg-card space-y-4 min-h-[120px] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4.5 w-16 rounded-none" />
                    <Skeleton className="h-4.5 w-14 rounded-none" />
                  </div>
                  <Skeleton className="h-4 w-full rounded-none" />
                  <Skeleton className="h-4 w-2/3 rounded-none" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/20">
                  <Skeleton className="h-3 w-16 rounded-none" />
                  <Skeleton className="h-3 w-24 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group 2 (Yesterday) */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4.5 w-24 rounded-none shrink-0" />
            <div className="h-px bg-border/40 flex-grow" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 border border-border bg-card space-y-4 min-h-[120px] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4.5 w-16 rounded-none" />
                    <Skeleton className="h-4.5 w-14 rounded-none" />
                  </div>
                  <Skeleton className="h-4 w-5/6 rounded-none" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/20">
                  <Skeleton className="h-3 w-16 rounded-none" />
                  <Skeleton className="h-3 w-24 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
