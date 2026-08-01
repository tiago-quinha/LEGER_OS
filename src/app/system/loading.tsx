import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Sliders, Calendar, Sparkles, Smartphone } from "lucide-react"

export default function SystemLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-8 md:space-y-12 pb-24 md:pb-8 w-full animate-fade-in">
      {/* 1. Header */}
      <header className="space-y-4 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" />
            <span>Configuration Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            System Config
          </h1>
        </div>
      </header>

      {/* 2. Tabs Navigation — matches SystemConfigView:
           flex-col on mobile (stacked vertically),
           sm:grid sm:grid-cols-4 on sm+ (horizontal grid) */}
      <div className="bg-secondary/40 border border-border p-1 sm:p-1.5 w-full flex flex-col sm:grid sm:grid-cols-4 gap-1 sm:gap-1.5">
        {[
          { icon: Calendar, label: "Cycle & AI Engine" },
          { icon: Sparkles, label: "Habits & Merchant Rules" },
          { icon: Smartphone, label: "Phone Posting" },
          { icon: Sparkles, label: "PRO Plan Status" },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-2 h-10 sm:h-11 px-4 bg-card/30 border border-border/40 ${i === 0 ? "bg-secondary/60 border-border" : ""}`}>
            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>

      {/* 3. Configuration Card Content — matches CardHeader + CardContent layout */}
      <div className="border border-border ledger-border bg-card p-6 md:p-10 space-y-8">
        {/* Card Header */}
        <div className="space-y-2 border-b border-border pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>

        {/* Cycle mode selector — grid-cols-1 sm:grid-cols-2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 border border-border bg-card space-y-2.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-9 w-full rounded-none" />
          </div>
          <div className="p-5 border border-border/40 bg-card/40 space-y-2.5 opacity-60">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>

        {/* Form fields grid — 1-col mobile, 2-col md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-11 w-full rounded-none" />
        </div>

        {/* Save button — right-aligned */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Skeleton className="h-11 w-36 rounded-none" />
        </div>
      </div>
    </div>
  )
}
