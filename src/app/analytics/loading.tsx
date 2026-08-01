import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Activity, History, Percent, ShieldCheck, Landmark } from "lucide-react"

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-16 pb-24 md:pb-8 w-full animate-fade-in">
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Financial Analytics</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Analytics
          </h1>
        </div>
      </header>

      {/* 2. Primary Charts Grid (Net Profit Trajectory & Cash Flow Velocity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: Net Profit Trajectory (SVG Area Chart Skeleton) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>

          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card relative overflow-hidden flex flex-col justify-between">
            <div className="flex-1 bg-muted/30 rounded-sm animate-pulse" />
            <div className="flex justify-between w-full pt-4 border-t border-border/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </section>

        {/* Chart B: Cash Flow Velocity (SVG Bar Chart Skeleton) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-40" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>

          <div className="min-h-[300px] h-[350px] w-full border border-border ledger-border p-4 md:p-6 bg-card relative overflow-hidden flex flex-col justify-between">
            <div className="flex-1 bg-muted/30 rounded-sm animate-pulse" />
            <div className="flex justify-between w-full pt-4 border-t border-border/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Key Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Activity },
          { icon: History },
          { icon: Percent },
          { icon: ShieldCheck }
        ].map((item, idx) => (
          <div key={idx} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <item.icon className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* 4. Category Burn Distribution (Baseline Drift Grid) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <Skeleton className="h-4 w-52" />
          <div className="flex items-center gap-2">
            <Landmark className="h-3 w-3 text-muted-foreground/40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="border border-border ledger-border bg-card/40 p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-12 rounded-none" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-1.5 w-full bg-secondary/50 relative overflow-hidden">
                  <Skeleton className="h-full w-[65%]" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
