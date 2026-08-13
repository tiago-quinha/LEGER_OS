import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36 bg-secondary/60" />
          <Skeleton className="h-12 w-64 bg-secondary/80" />
        </div>
      </div>

      {/* Executive Ledger Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border">
            <Skeleton className="h-3 w-32 bg-secondary/60" />
            <Skeleton className="h-10 w-48 bg-secondary/80" />
          </div>
        ))}
      </div>

      {/* Search & Dynamic Filter Tabs Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-full bg-card border border-border/60" />
        <div className="flex gap-2 border-b border-border/30 pb-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 bg-secondary/40 shrink-0" />
          ))}
        </div>
      </div>

      {/* Holdings Cards List Skeleton */}
      <div className="space-y-2.5">
        <div className="border-b border-border/40 pb-2">
          <Skeleton className="h-7 w-32 bg-secondary/80" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3.5 bg-card/40 border border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-secondary/60" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24 bg-secondary/80" />
                    <Skeleton className="h-4 w-12 bg-secondary/40 rounded-full" />
                  </div>
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
