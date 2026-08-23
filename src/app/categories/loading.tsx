import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tag, ChevronLeft, ChevronRight, Sliders } from "lucide-react"

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-24 md:pb-8 w-full animate-fade-in">
      {/* 1. Header */}
      <header className="flex items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8 relative flex-wrap sm:flex-nowrap">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            <span>Category Explorer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Categories
          </h1>
        </div>
        <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
          <div className="px-3 py-2 border-r border-border"><ChevronLeft className="h-4 w-4 text-muted-foreground/40" /></div>
          <div className="px-3 py-2"><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></div>
        </div>
      </header>

      {/* 2. Category Card Grid — horizontal scroll on mobile, md:grid on desktop */}
      <section className="space-y-4">
        <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-x-auto pb-3 md:pb-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] md:w-auto border border-border bg-card/40 p-3.5 flex flex-col justify-between min-h-[95px]">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="mt-4 space-y-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Metrics Summary (1-col mobile, 3-col md+) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border relative flex flex-col justify-between min-h-[140px]">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </section>

      {/* 4. Controls + Chart Grid — single col on mobile/tablet, lg:col-span split on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Filter Panel (full-width on mobile, lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-3 w-16" />
            <Sliders className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
          <div className="border border-border bg-card/30 p-5 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full rounded-none" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-none" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-none" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <div className="grid grid-cols-3 border border-border bg-card p-0.5 gap-0.5">
                <Skeleton className="h-8 rounded-none" />
                <Skeleton className="h-8 rounded-none" />
                <Skeleton className="h-8 rounded-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Trajectory Graph (full-width on mobile, lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <Skeleton className="h-4 w-48" />
            <div className="flex border border-border p-0.5 bg-card gap-0.5">
              <Skeleton className="h-6 w-20 rounded-none" />
              <Skeleton className="h-6 w-16 rounded-none" />
            </div>
          </div>

          {/* Chart container — plain pulsing block instead of broken SVG */}
          <div className="min-h-[320px] h-[360px] w-full border border-border ledger-border p-4 md:p-6 bg-card overflow-hidden flex flex-col justify-between">
            <div className="flex-1 bg-muted/30 rounded-sm animate-pulse" />
            <div className="flex justify-between w-full pt-4 border-t border-border/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Category Transactions Ledger Table */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="border border-border ledger-border bg-card p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between border-b border-border/40 last:border-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
