import { cn } from "@halaal-vest/ui/lib/utils"

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
        "rounded-[22px] border p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        tone === "default" && "border-border/70 bg-card",
        tone === "positive" && "border-emerald-200/80 bg-emerald-50/70",
        tone === "warning" && "border-amber-200/80 bg-amber-50/70",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    </article>
  )
}
