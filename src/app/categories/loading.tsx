import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-24 md:pb-8 w-full animate-pulse">
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <Skeleton className="h-10 md:h-14 w-64" />
        </div>
      </header>

      {/* 2. Interactive Category Grid (Category Matrix) */}
      <section className="space-y-4">
        <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-x-auto pb-3 md:pb-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[160px] md:w-auto border border-border p-3.5 bg-card/40 flex flex-col justify-between min-h-[95px] rounded-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 w-full">
                  <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 w-20 shrink-0" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Metrics Summary Bento Grid (Outflow, Inflow, Net) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between opacity-40">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </section>

      {/* 4. Controls, Date Filter, and Trend Graph (Split Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Filter Matrix Block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <div className="border border-border ledger-border bg-card/30 p-5 space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Graph Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4.5 w-36" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex-1 flex items-end justify-between gap-1 pt-6">
              {Array.from({ length: 15 }).map((_, idx) => (
                <Skeleton key={idx} className="w-[5%] rounded-sm" style={{ height: `${15 + (idx % 4) * 20}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Transaction Details Table */}
      <div className="border border-border ledger-border bg-card overflow-hidden">
        <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
          <Skeleton className="h-4.5 w-32" />
          <Skeleton className="h-4.5 w-16" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4.5 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
