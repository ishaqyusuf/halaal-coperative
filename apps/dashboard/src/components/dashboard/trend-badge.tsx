import { cn } from "@halaalvest/ui/lib/utils"

export function TrendPill({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode
  className?: string
  tone?: "neutral" | "positive" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "positive" && "bg-emerald-100 text-emerald-700",
        tone === "warning" && "bg-amber-100 text-amber-700",
        className
      )}
    >
      {children}
    </span>
  )
}
