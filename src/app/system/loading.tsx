import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function SystemLoading() {
  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 sm:p-8 md:p-12 space-y-8 pb-32 animate-pulse">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-8 w-64 md:w-[450px]" />
          </div>
          <div className="pl-8 pt-1">
            <Skeleton className="h-3 w-80" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-none" />
        </div>
      </div>

      {/* 2. Quick Environment Controls Strip (Exact 3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border bg-card p-4 flex flex-col justify-between min-h-[180px] rounded-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3.5 w-full mt-2" />
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-9 w-full rounded-none mt-2" />
          </div>
        ))}
      </div>

      {/* 3. Tabs Trigger List */}
      <div className="bg-secondary/40 border border-border p-1.5 grid grid-cols-1 sm:grid-cols-4 gap-1.5 max-h-16">
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
      </div>

      {/* 4. Tab Content Card */}
      <div className="border border-border bg-card shadow-lg rounded-none">
        <div className="border-b border-border px-6 sm:px-8 py-6 bg-secondary/10 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4.5 w-56" />
          </div>
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full rounded-none" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-full rounded-none" />
          </div>
          <Skeleton className="h-10 w-24 rounded-none" />
        </div>
      </div>
    </div>
  )
}
