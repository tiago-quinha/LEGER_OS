import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { List } from "lucide-react"

export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-24 md:pb-8 w-full animate-fade-in">
      {/* 1. Header — matches flex-col on mobile, flex-row on md+ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <List className="h-3.5 w-3.5" />
            <span>Transaction ledger</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Ledger
          </h1>
        </div>

        {/* Buttons: Add Entry is hidden on mobile (sm:inline-flex), AI Cleanse hidden on <md */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Skeleton className="hidden sm:block h-10 w-32 rounded-none" />
          <Skeleton className="hidden md:block h-10 w-44 rounded-none" />
        </div>
      </header>

      {/* 2. Executive Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-4 bg-card/20 border border-border min-h-[140px] flex flex-col justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* 3. Main Data Table Container */}
      <div className="border border-border ledger-border bg-card">
        {/* Table Card Toolbar Header */}
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="h-6 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-none" />
            <Skeleton className="h-8 w-24 rounded-none" />
          </div>
        </div>

        {/* Filter Controls Bar — single col on mobile, 4-col on md+ */}
        <div className="p-4 bg-secondary/15 border-b border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none sm:col-span-2 md:col-span-1" />
          <Skeleton className="h-9 w-full rounded-none hidden md:block" />
        </div>

        {/* Mobile View: Stacked cards (md:hidden) — mirrors ExpensesView mobile card layout */}
        <div className="md:hidden space-y-3 px-3 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border border-border bg-card/25 flex flex-col gap-3">
              <div className="flex items-center justify-between min-w-0 gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Checkbox */}
                  <Skeleton className="h-8 w-8 rounded-none shrink-0" />
                  <div className="flex flex-col min-w-0 gap-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24 rounded-none" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table (hidden md:block) — 5 visible columns + hidden Source/Actions */}
        <div className="hidden md:block p-4 sm:p-6 space-y-4">
          {/* Column Header */}
          <div className="flex items-center gap-4 pb-3 border-b border-border/60">
            <Skeleton className="h-3 w-4 shrink-0" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-40 flex-1" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* 8 Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
              <Skeleton className="h-4 w-4 rounded-none shrink-0" />
              <Skeleton className="h-3.5 w-20 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-24 rounded-none shrink-0" />
              <Skeleton className="h-3.5 w-20 shrink-0" />
              <Skeleton className="h-5 w-20 shrink-0" />
              <Skeleton className="h-4 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
