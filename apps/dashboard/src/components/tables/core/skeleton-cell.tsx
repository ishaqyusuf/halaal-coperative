import { cn } from "@halaalvest/ui/lib/utils"

export function SkeletonCell({
  className,
  type = "text",
}: {
  className?: string
  type?: "text" | "badge"
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-muted/60",
        type === "badge" ? "h-6 w-20" : "h-4 w-24",
        className
      )}
    />
  )
}
