import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CalendarRange, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 w-full animate-fade-in pb-24 md:pb-8">

      {/* 1. Header — matches DashboardView exactly: label + H1, nothing else */}
      <header className="flex items-center justify-between gap-6 pb-4 md:pb-6 relative border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Active Paycheck Cycle</span>
          </div>
          <Skeleton className="h-10 md:h-12 w-64 rounded-none" />
        </div>
      </header>

      {/* Dual Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Core Financial Path (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">

          {/* 2. Trajectories Chart Area */}
          <section className="space-y-6 pt-2 sm:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full">
                {/* Liquidity / Burn Tab Switcher */}
                <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <div className="px-4 md:px-6 py-2 border-r border-border"><Skeleton className="h-4 w-16" /></div>
                  <div className="px-4 md:px-6 py-2"><Skeleton className="h-4 w-10" /></div>
                </div>
                {/* View Mode Switcher (Graph / Calendar icon buttons) */}
                <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <div className="px-4 py-2 border-r border-border"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" /></div>
                  <div className="px-4 py-2"><Skeleton className="h-3.5 w-3.5" /></div>
                </div>
                {/* Cycle Navigation Chevrons */}
                <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
                  <div className="px-3.5 py-2 border-r border-border"><ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
                  <div className="px-3.5 py-2"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
                </div>
              </div>
            </div>

            {/* Full-width statistics bar */}
            <div className="flex items-center justify-between gap-4 py-2.5 px-4 border border-border ledger-border bg-card w-full">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <span className="text-muted-foreground/30 font-light select-none">|</span>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="min-h-[320px] md:min-h-[420px] w-full border border-border ledger-border p-4 md:p-8 bg-card relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-8 w-28 rounded-none" />
              </div>
              <div className="flex-1 w-full mt-6 relative min-h-[220px] flex flex-col justify-end">
                <div className="flex-1 bg-muted/30 rounded-sm animate-pulse min-h-[180px]" />
                <div className="flex justify-between w-full pt-4 border-t border-border/40">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-8" />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Metric Cards Grid (grid-cols-2 md:grid-cols-3, card 0 is col-span-2 md:col-span-1) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { labelWidth: "w-28", subWidth: "w-24", valWidth: "w-36", leftWidth: "w-28", rightWidth: "w-20" },
              { labelWidth: "w-24", subWidth: "w-24", valWidth: "w-32", leftWidth: "w-24", rightWidth: "w-20" },
              { labelWidth: "w-24", subWidth: "w-24", valWidth: "w-32", leftWidth: "w-20", rightWidth: "w-24" }
            ].map((card, i) => (
              <div
                key={i}
                className={cn(
                  "p-6 md:p-8 space-y-4 bg-card/20 border border-border relative overflow-hidden flex flex-col justify-between min-h-[160px] w-full",
                  i === 0 ? "col-span-2 md:col-span-1" : "col-span-1"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 w-full">
                  <Skeleton className={cn("h-3.5", card.labelWidth)} />
                  <Skeleton className={cn("h-3 hidden sm:inline-block", card.subWidth)} />
                </div>
                <Skeleton className={cn("h-8 my-1", card.valWidth)} />
                <div className="space-y-2 mt-auto w-full">
                  <div className="flex justify-between items-center w-full">
                    <Skeleton className={cn("h-3", card.leftWidth)} />
                    <Skeleton className={cn("h-3", card.rightWidth)} />
                  </div>
                  <div className="w-full h-1 bg-secondary/50 rounded-none border border-border/40 overflow-hidden">
                    <Skeleton className="h-full w-[65%]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Budget Performance (grid-cols-1 md:grid-cols-2) */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-24 ml-auto" />
                      <Skeleton className="h-3 w-20 ml-auto" />
                    </div>
                  </div>
                  <div className="relative w-full h-2.5 bg-secondary/60 rounded-none border border-border/40">
                    <Skeleton className="h-full w-[55%]" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Recent Transactions */}
          <section className="space-y-6 pb-10">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-4 flex items-center justify-between border-b border-border/50">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            {/* "Access Full Archive" button */}
            <Skeleton className="h-14 w-full rounded-none" />
          </section>

        </div>

        {/* RIGHT COLUMN: Control Center / Telemetry (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-10 md:space-y-14 border-t lg:border-t-0 lg:border-l border-border/50 pt-10 lg:pt-0 lg:pl-6">

          {/* Active Cycle HUD + Smart Forecasts */}
          <div className="space-y-6">

            {/* Paycheck Cycle Card */}
            <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <Skeleton className="h-5 w-28 rounded-none" />
              </div>
              <div className="space-y-2 w-full">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="h-1.5 w-full bg-secondary border border-border/80" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Cycle Forecast Card */}
            <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-5 w-24 rounded-none" />
              </div>
              <div className="space-y-2 w-full">
                <div className="flex justify-between items-baseline">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

          </div>

          {/* AI Strategy Insights (LegerAIIntelligence component) */}
          <section className="space-y-4">
            <div className="min-h-[200px] w-full border border-border ledger-border bg-card/20 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[92%]" />
                  <Skeleton className="h-3 w-[78%]" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Skeleton className="h-8 w-28 rounded-none" />
                <Skeleton className="h-8 w-20 rounded-none" />
              </div>
            </div>
          </section>

          {/* Forecast Overrides Console (right column, not left) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
              <div className="space-y-0.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="border border-border p-6 bg-card/10 flex flex-col items-center justify-center text-center min-h-[120px] space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-7 w-32 rounded-none" />
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}
