import { cn } from "@halaalvest/ui/lib/utils"

export function DashboardStatCard({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: string
  label: string
  tone?: "default" | "positive" | "warning"
  value: string
}) {
  return (
    <article
      className={cn(
        "rounded-lg border bg-background p-4",
        tone === "default" && "border-border/70",
        tone === "positive" && "border-emerald-200",
        tone === "warning" && "border-amber-200"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal [overflow-wrap:anywhere] text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      ) : null}
    </article>
  )
}
