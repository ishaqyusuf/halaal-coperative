import Link from "next/link"
import { cn } from "@halaalvest/ui/lib/utils"

export function MembersSummaryCard({
  detail,
  href,
  label,
  tone = "default",
  value,
}: {
  detail: string
  href?: string
  label: string
  tone?: "default" | "positive" | "warning"
  value: string
}) {
  const card = (
    <div
      className={cn(
        "rounded-xl border bg-card px-5 py-4 text-left transition-colors",
        tone === "default" && "border-border",
        tone === "positive" && "border-border",
        tone === "warning" && "border-border",
        href && "hover:bg-accent/25",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            "text-2xl font-medium tracking-tight text-foreground",
            tone === "positive" && "text-emerald-700 dark:text-emerald-400",
            tone === "warning" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {value}
        </div>
        <div className="text-sm text-foreground">{label}</div>
        <div className="text-xs leading-5 text-muted-foreground">{detail}</div>
      </div>
    </div>
  )

  if (!href) {
    return card
  }

  return (
    <Link className="block text-left" href={href}>
      {card}
    </Link>
  )
}
