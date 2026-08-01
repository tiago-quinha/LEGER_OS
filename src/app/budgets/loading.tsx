import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PiggyBank, Plus, ChevronLeft, ChevronRight } from "lucide-react"

export default function BudgetsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 w-full animate-fade-in pb-20">
      {/* 1. Header */}
      <header className="flex items-center justify-between gap-6 border-b border-foreground/10 pb-6 md:pb-8 relative flex-wrap sm:flex-nowrap">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <PiggyBank className="h-3.5 w-3.5" />
            <span>Budget Management</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Budgets
          </h1>
        </div>

        {/* Cycle Nav Controls */}
        <div className="flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0">
          <div className="px-3.5 py-2 border-r border-border"><ChevronLeft className="h-4 w-4 text-muted-foreground/40" /></div>
          <div className="px-3.5 py-2"><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></div>
        </div>
      </header>

      {/* 2. Budget Cards Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10">
        {/* Create Target Vector Card Mock */}
        <div className="border-2 border-dashed border-border/50 p-10 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
          <Plus className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28 mt-2" />
        </div>

        {/* Category Budget Cards Mock */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-none ledger-border p-6 sm:p-8 space-y-6 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-5 w-20 rounded-none" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="relative w-full h-2 bg-secondary/60 rounded-full border border-border/40 flex items-center">
                <div className="absolute left-1/2 -top-1 -bottom-1 -translate-x-1/2 w-0.5 bg-foreground/60 z-20" />
                <Skeleton className="h-full w-[45%] rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
