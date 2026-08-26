import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, Search } from "lucide-react"

export default function MemoryLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 md:space-y-8 pb-36 md:pb-8 w-full animate-fade-in">
      
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-foreground/10 pb-4 md:pb-6 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            <span>Neural Context Memory</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            My Memory
          </h1>
          <div className="flex items-center gap-3 pt-0.5">
            <Skeleton className="h-3 w-32 rounded-none bg-secondary/50" />
          </div>
        </div>
      </header>

      {/* Centered Content Column */}
      <div className="max-w-[900px] mx-auto w-full space-y-5 md:space-y-6">

        {/* AI Chat Input Bar Skeleton */}
        <div className="relative flex items-center w-full">
          <div className="w-full h-11 rounded-full border border-border bg-secondary/35 flex items-center px-4 justify-between">
            <Skeleton className="h-3.5 w-48 rounded-full bg-secondary/60" />
            <Skeleton className="h-8 w-8 rounded-full bg-secondary/70 shrink-0" />
          </div>
        </div>

        {/* Search + Filter Tabs Skeleton */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />
            <div className="w-full h-8 bg-card border border-border/60 rounded-none" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-border/30">
            {["Timeline", "Vacation", "Routine", "Budget", "Life Change"].map((label, i) => (
              <div
                key={i}
                className="px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-border/40 bg-card text-muted-foreground/40 shrink-0"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Memory Timeline List Skeleton */}
        <div className="space-y-6">
          {/* Group 1 (Today) */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground/40 shrink-0">
                TODAY
              </span>
              <div className="h-px bg-border/40 flex-grow" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border border-border ledger-border bg-card space-y-3 min-h-[110px] flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                        <Skeleton className="h-3 w-16 rounded-none bg-secondary/50" />
                      </div>
                      <Skeleton className="h-3 w-3 rounded-none bg-secondary/30" />
                    </div>
                    <Skeleton className="h-3.5 w-full rounded-none bg-secondary/50" />
                    <Skeleton className="h-3.5 w-3/4 rounded-none bg-secondary/40" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/20">
                    <Skeleton className="h-2.5 w-14 rounded-none bg-secondary/40" />
                    <Skeleton className="h-2.5 w-20 rounded-none bg-secondary/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
