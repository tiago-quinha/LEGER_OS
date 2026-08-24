import { Skeleton } from "@/components/ui/skeleton"

export default function DownloadLoading() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 rounded-none" />
        <Skeleton className="h-12 w-96 rounded-none" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 md:p-8 bg-card/40 border border-border space-y-6">
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-12 w-full rounded-none" />
        </div>
        <div className="lg:col-span-4 p-6 md:p-8 bg-card/20 border border-border space-y-4">
          <Skeleton className="h-32 w-full rounded-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Skeleton className="h-48 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
      </div>
    </div>
  )
}
