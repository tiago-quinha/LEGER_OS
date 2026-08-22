import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CalendarRange, TrendingUp, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 md:space-y-8 pb-36 md:pb-8 w-full animate-fade-in">

      {/* 1. Header — matches DashboardView exactly: Active Paycheck Cycle label + H1 */}
      <header className="flex items-center justify-between gap-4 pb-3 md:pb-4 relative border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Active Paycheck Cycle</span>
          </div>
          <Skeleton className="h-10 md:h-12 w-64 rounded-none" />
        </div>
      </header>

      {/* 2. Trajectories */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full">
            {/* Liquidity / Burn Switcher */}
            <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
              <div className="px-4 md:px-6 py-2 border-r border-border bg-foreground text-background">
                <span className="text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest">Liquidity</span>
              </div>
              <div className="px-4 md:px-6 py-2">
                <span className="text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground">Burn</span>
              </div>
            </div>

            {/* View Mode (Graph / Calendar) */}
            <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
              <div className="px-4 py-2 border-r border-border bg-foreground text-background">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div className="px-4 py-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Cycle Navigation Chevrons */}
            <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
              <div className="px-3.5 py-2 border-r border-border"><ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
              <div className="px-3.5 py-2"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
            </div>
          </div>
        </div>

        {/* Full-width statistics bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-2 px-4 border border-border ledger-border bg-card text-[10px] font-mono w-full">
          <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
            <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">Net Cash Flow:</span>
            <Skeleton className="h-3.5 w-16" />
          </div>
          <span className="hidden sm:inline text-muted-foreground/30 font-light select-none">|</span>
          <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto border-t border-border/30 pt-2 sm:pt-0 sm:border-0">
            <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">Daily Burn:</span>
            <Skeleton className="h-3.5 w-16" />
          </div>
          <span className="hidden sm:inline text-muted-foreground/30 font-light select-none">|</span>
          <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto border-t border-border/30 pt-2 sm:pt-0 sm:border-0">
            <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">Projected Close:</span>
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="min-h-[300px] md:min-h-[400px] h-fit w-full border border-border ledger-border p-4 md:p-10 bg-card/40 relative overflow-hidden flex flex-col justify-between">
          <div className="flex-1 w-full relative min-h-[220px] flex flex-col justify-end">
            <div className="flex-1 bg-muted/20 rounded-sm animate-pulse min-h-[200px]" />
            <div className="flex justify-between w-full pt-4 border-t border-border/40">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Liquidity Position", sub: "EST. CYCLE END" },
          { label: "Total Inflow", sub: "REVENUE TARGET" },
          { label: "Total Outflow", sub: "SPENDING LIMIT" }
        ].map((m, idx) => (
          <div
            key={idx}
            className={cn(
              "relative h-full flex flex-col justify-stretch min-w-0 w-full",
              idx === 0 ? "col-span-2 md:col-span-1" : "col-span-1"
            )}
          >
            <div className="p-5 md:p-6 space-y-3 bg-card/20 border border-border relative overflow-hidden flex flex-col justify-between grow w-full h-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 z-10 w-full min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">{m.label}</span>
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter shrink-0 hidden sm:inline-block">{m.sub}</span>
              </div>

              <div className="text-2xl lg:text-3xl font-sans font-bold tracking-tight z-10 w-full py-1">
                <Skeleton className="h-8 w-32 rounded-none" />
              </div>

              <div className="z-10 w-full min-w-0 space-y-2 mt-auto">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-[9px] font-mono w-full min-w-0">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="w-full h-1 bg-secondary/30 rounded-none border border-border/40 overflow-hidden">
                  <Skeleton className="h-full w-[60%]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Budget Performance */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <h2 className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold">Budget Limits</h2>
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-2.5 -mx-2.5">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-3 w-20 ml-auto" />
                </div>
              </div>
              <div className="relative w-full h-2 bg-secondary/30 rounded-none border border-border/40">
                <Skeleton className="h-full w-[50%]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Recent Transactions */}
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold">Recent Transactions</h3>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between px-2 border-b border-border/50">
              <div className="space-y-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <Skeleton className="w-full h-12 rounded-none border border-border mt-4" />
        </div>
      </div>

      {/* Clean Minimal App Footer */}
      <footer className="w-full border-t border-border/40 py-6 mt-16 relative z-10 font-mono text-[10px] text-muted-foreground">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="font-bold uppercase tracking-wider text-foreground">LEGER_OS</span>
            <span className="opacity-40">•</span>
            <span className="uppercase tracking-widest text-[9px]">Personal Finance Mainframe</span>
          </div>

          <div className="flex items-center gap-4 uppercase tracking-wider text-[9px]">
            <span>Terms of Service</span>
            <span className="opacity-40">•</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
