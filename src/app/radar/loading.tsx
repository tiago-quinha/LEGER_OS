import { Skeleton } from "@/components/ui/skeleton"

export default function RadarLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full font-mono">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 md:pb-6 relative border-b border-border">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36 rounded-none" />
          <Skeleton className="h-10 w-64 rounded-none" />
        </div>
        <Skeleton className="h-9 w-32 rounded-none" />
      </header>

      {/* 4 Executive Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 space-y-3 bg-card/20 border border-border">
            <Skeleton className="h-3 w-28 rounded-none" />
            <Skeleton className="h-8 w-36 rounded-none" />
            <Skeleton className="h-3 w-48 rounded-none" />
          </div>
        ))}
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
        <Skeleton className="h-4 w-44 rounded-none" />
        <Skeleton className="h-8 w-48 rounded-none" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 bg-card/20 border border-border space-y-4 rounded-none">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 rounded-none" />
              <Skeleton className="h-4 w-16 rounded-none" />
            </div>
            <Skeleton className="h-6 w-24 rounded-none" />
            <Skeleton className="h-3 w-full rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
