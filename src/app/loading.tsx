import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 w-full">
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-muted-foreground">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-10 md:h-14 w-64 md:w-96" />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto">
          {/* Velocity Meter Mock */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-1.5 w-24 md:w-32" />
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
            </div>
          </div>

          {/* Cycle Nav Controls Mock */}
          <div className="flex border border-border ledger-border bg-card overflow-hidden">
            <Skeleton className="h-10 w-10 md:h-12 md:w-12 border-r border-border rounded-none" />
            <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-none" />
          </div>
        </div>
      </header>

      {/* Dual Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Core Financial Path (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-10 md:space-y-16">
          
          {/* 2. Trajectories Chart Area */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
              <Skeleton className="h-9 w-40" />
            </div>
            
            {/* The Chart Card Skeleton */}
            <div className="min-h-[300px] md:min-h-[400px] w-full border border-border ledger-border p-4 md:p-10 bg-card/40 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex-1 flex items-end justify-between gap-2 pt-6">
                <Skeleton className="h-[25%] w-[8%] rounded-sm animate-pulse [animation-delay:100ms]" />
                <Skeleton className="h-[45%] w-[8%] rounded-sm animate-pulse [animation-delay:200ms]" />
                <Skeleton className="h-[35%] w-[8%] rounded-sm animate-pulse [animation-delay:300ms]" />
                <Skeleton className="h-[80%] w-[8%] rounded-sm animate-pulse [animation-delay:400ms]" />
                <Skeleton className="h-[55%] w-[8%] rounded-sm animate-pulse [animation-delay:500ms]" />
                <Skeleton className="h-[65%] w-[8%] rounded-sm animate-pulse [animation-delay:600ms]" />
                <Skeleton className="h-[40%] w-[8%] rounded-sm animate-pulse [animation-delay:700ms]" />
                <Skeleton className="h-[70%] w-[8%] rounded-sm animate-pulse [animation-delay:800ms]" />
                <Skeleton className="h-[95%] w-[8%] rounded-sm animate-pulse [animation-delay:900ms]" />
              </div>
            </div>
          </section>

          {/* 3. Metric cards grid (Exact 3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border ledger-border bg-card/20 p-6 md:p-8 space-y-4 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-36" />
                <div className="space-y-2 mt-auto w-full">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div className="w-full h-1 bg-secondary/30 rounded-none border border-border/40 overflow-hidden">
                    <Skeleton className="h-full w-[60%] bg-muted/80" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Budgets Performance (Exact 2 Columns) */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-28 ml-auto" />
                      <Skeleton className="h-3 w-32 ml-auto" />
                    </div>
                  </div>
                  <div className="relative w-full h-2.5 bg-secondary/60 rounded-none border border-border/40">
                    <Skeleton className="h-full w-[45%]" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Logs & Archive Grid (Exact 2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-10">
            {/* Classification Log */}
            <div className="space-y-6">
              <Skeleton className="h-4 w-36 border-b border-border pb-4" />
              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="h-px w-full bg-border relative">
                      <Skeleton className="absolute top-0 left-0 h-px w-[30%]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Archive */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="py-4 flex items-center justify-between border-b border-border/50">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4.5 w-40" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: AI Co-Processor / Telemetry (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-10 md:space-y-14 border-t lg:border-t-0 lg:border-l border-border/50 pt-10 lg:pt-0 lg:pl-6">
          
          {/* HUD Cards */}
          <div className="space-y-6">
            
            {/* Active Paycheck Cycle HUD */}
            <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-2 z-10 w-full">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="h-3 w-full bg-secondary border border-border/80" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Smart Forecasting Card */}
            <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2 z-10 w-full">
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

          {/* AI Strategy Insights */}
          <section className="space-y-4">
            <div className="h-[200px] w-full border border-border ledger-border bg-card/20 rounded-lg p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full animate-pulse [animation-delay:100ms]" />
                  <Skeleton className="h-3 w-[92%] animate-pulse [animation-delay:200ms]" />
                  <Skeleton className="h-3 w-[78%] animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}
