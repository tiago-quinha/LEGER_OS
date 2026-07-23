import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6 w-full animate-pulse">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
          <p className="text-muted-foreground">Manage your transactions and automation rules.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-10 w-full sm:w-32" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
      </div>

      {/* 2. Executive Ledger Summary Cards Mock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border min-h-[120px] flex flex-col justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>

      {/* 3. Tabs List Mock */}
      <div className="w-full space-y-4">
        <div className="bg-card/40 border border-border p-1 grid grid-cols-3 w-full gap-1 max-h-12">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
        </div>

        {/* 4. Transactions List Mock */}
        <div className="border border-border ledger-border bg-card overflow-hidden">
          <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
            <Skeleton className="h-4.5 w-32" />
            <Skeleton className="h-4.5 w-24" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4.5 w-36 sm:w-48" />
                      <Skeleton className="h-3.5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <Skeleton className="h-4.5 w-20" />
                  <Skeleton className="h-7 w-7 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
