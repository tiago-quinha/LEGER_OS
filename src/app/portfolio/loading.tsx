import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full animate-pulse font-mono">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40 bg-secondary/60" />
          <Skeleton className="h-12 w-64 bg-secondary/80" />
        </div>
      </div>

      {/* 2. Portfolio Valuation Graph FIRST Skeleton */}
      <div className="space-y-4 border border-border ledger-border p-4 md:p-6 bg-card/20 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <Skeleton className="h-6 w-48 bg-secondary/80" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-56 bg-secondary/60" />
            <Skeleton className="h-7 w-28 bg-secondary/60" />
          </div>
        </div>
        <Skeleton className="h-[280px] md:h-[320px] w-full bg-secondary/20 rounded-none" />
      </div>

      {/* 3. 3 Executive Metric Cards SECOND (1 Big, 2 Side by Side) Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Card 1: Big col-span-2 on mobile, col-span-1 on desktop */}
        <div className="col-span-2 md:col-span-1">
          <div className="p-6 md:p-8 space-y-3 bg-card/20 border border-border h-full flex flex-col justify-between">
            <Skeleton className="h-3 w-28 bg-secondary/60" />
            <Skeleton className="h-9 md:h-11 w-36 md:w-48 bg-secondary/80" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-28 bg-secondary/40" />
              <Skeleton className="h-3 w-8 bg-secondary/30" />
            </div>
          </div>
        </div>
        {/* Card 2: col-span-1 */}
        <div className="col-span-1 min-w-0">
          <div className="p-6 md:p-8 space-y-3 bg-card/20 border border-border h-full flex flex-col justify-between">
            <Skeleton className="h-3 w-24 bg-secondary/60" />
            <Skeleton className="h-9 md:h-11 w-24 sm:w-32 bg-secondary/80" />
            <div className="flex items-center gap-1.5 pt-1">
              <Skeleton className="h-4 w-20 bg-secondary/40" />
              <Skeleton className="h-3 w-6 bg-secondary/30" />
            </div>
          </div>
        </div>
        {/* Card 3: col-span-1 */}
        <div className="col-span-1 min-w-0">
          <div className="p-6 md:p-8 space-y-3 bg-card/20 border border-border h-full flex flex-col justify-between">
            <Skeleton className="h-3 w-24 bg-secondary/60" />
            <Skeleton className="h-9 md:h-11 w-24 sm:w-32 bg-secondary/80" />
            <div className="flex items-center gap-1.5 pt-1">
              <Skeleton className="h-4 w-20 bg-secondary/40" />
              <Skeleton className="h-3 w-6 bg-secondary/30" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Search & Filter Tabs Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-full bg-card border border-border/60" />
        <div className="flex gap-2 border-b border-border/30 pb-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 bg-secondary/40 shrink-0" />
          ))}
        </div>
      </div>

      {/* 5. Asset List / Table Skeleton */}
      <div className="space-y-2.5">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 bg-card/40 border border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-secondary/60" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 bg-secondary/80" />
                  <Skeleton className="h-3 w-20 bg-secondary/40" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-4 w-20 bg-secondary/80 ml-auto" />
                <Skeleton className="h-3 w-16 bg-secondary/40 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
