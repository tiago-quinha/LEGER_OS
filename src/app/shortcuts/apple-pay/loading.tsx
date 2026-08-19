import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ApplePayShortcutsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-card/60 h-16 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-none bg-muted/40" />
          <Skeleton className="w-24 h-4 rounded-none bg-muted/40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-8 rounded-none bg-muted/40" />
          <Skeleton className="w-28 h-8 rounded-none bg-muted/40" />
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-12 w-full">
        {/* Title Skeleton */}
        <div className="space-y-3">
          <Skeleton className="w-48 h-3 rounded-none bg-muted/40" />
          <Skeleton className="w-96 h-10 rounded-none bg-muted/40" />
          <Skeleton className="w-full max-w-2xl h-4 rounded-none bg-muted/40" />
        </div>

        {/* 3 Metric Card Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border">
            <Skeleton className="w-24 h-3 rounded-none bg-muted/40" />
            <Skeleton className="w-40 h-8 rounded-none bg-muted/40" />
            <Skeleton className="w-full h-3 rounded-none bg-muted/40" />
          </div>
          <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border">
            <Skeleton className="w-24 h-3 rounded-none bg-muted/40" />
            <Skeleton className="w-40 h-8 rounded-none bg-muted/40" />
            <Skeleton className="w-full h-3 rounded-none bg-muted/40" />
          </div>
          <div className="p-6 md:p-8 space-y-4 bg-card/20 border border-border">
            <Skeleton className="w-24 h-3 rounded-none bg-muted/40" />
            <Skeleton className="w-40 h-8 rounded-none bg-muted/40" />
            <Skeleton className="w-full h-3 rounded-none bg-muted/40" />
          </div>
        </div>

        {/* Tab & Content Skeleton */}
        <div className="space-y-6">
          <Skeleton className="w-72 h-10 rounded-none bg-muted/40" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-none bg-card/40 border border-border" />
            <Skeleton className="h-48 rounded-none bg-card/40 border border-border" />
            <Skeleton className="h-48 rounded-none bg-card/40 border border-border" />
          </div>
        </div>
      </main>
    </div>
  )
}
