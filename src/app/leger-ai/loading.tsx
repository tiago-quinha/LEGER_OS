import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain } from "lucide-react"

export default function LegerAiLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-12 pb-24 text-foreground w-full animate-fade-in">
      {/* 1. Header: The Intelligence Node */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-foreground/10 pb-8 relative">
        <div className="absolute top-0 right-0 technical-label opacity-20 hidden lg:block uppercase tracking-widest text-[9px]">
          NODE_ID: LEGER_CORE_05 // ENCRYPTED
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-4 w-4 animate-pulse text-foreground/80" />
            <span>Neural Synthesis</span>
            <span className="opacity-30">/</span>
            <span>STRATEGY_NODE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-none">
            Leger AI
          </h1>
        </div>
        <Skeleton className="h-12 w-full md:w-36 rounded-none animate-pulse" />
      </header>

      {/* 2. Main Terminal Area (Exact 1:2 split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        
        {/* Left Column: Data Telemetry (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6 lg:space-y-12">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            
            <div className="space-y-4">
              {/* Threat Vector */}
              <div className="space-y-1.5 py-2 border-b border-border/50">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <div className="w-full h-1.5 bg-secondary/50 overflow-hidden relative">
                  <Skeleton className="h-full w-[40%]" />
                </div>
              </div>
              
              {/* Cycle Velocity */}
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              
              {/* Last Sync */}
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
          </div>

          {/* Strategic Standing */}
          <div className="p-6 bg-secondary/10 border border-border ledger-border space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
        </div>

        {/* Right Column: Leger Feed / Terminal (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="min-h-[400px] border border-border ledger-border bg-card relative p-6 md:p-12 pt-14 md:pt-14 flex flex-col justify-between overflow-hidden text-left shadow-xl">
            
            {/* Dialogue Feed */}
            <div className="space-y-6 flex-1">
              <div className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[88%]" />
                </div>
              </div>

              <div className="flex items-start gap-4 justify-end">
                <div className="space-y-2 flex-1 flex flex-col items-end">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>

            {/* Input Bar area at bottom */}
            <div className="border-t border-border/55 pt-6 mt-8 flex gap-3">
              <Skeleton className="h-10 flex-1 rounded-none" />
              <Skeleton className="h-10 w-24 rounded-none" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
