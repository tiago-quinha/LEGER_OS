import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/80 dark:bg-muted/60 border border-transparent",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_linear] bg-gradient-to-r from-transparent via-foreground/15 dark:via-foreground/10 to-transparent" />
    </div>
  )
}
