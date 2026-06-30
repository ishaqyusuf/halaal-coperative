import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { cn } from "@halaalvest/ui/lib/utils"

export function OverviewActionLink({
  children,
  className,
  href,
  variant = "outline",
}: {
  children: React.ReactNode
  className?: string
  href: string
  variant?: "ghost" | "outline" | "secondary"
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors",
        variant === "outline" &&
          "border border-border bg-background hover:bg-muted",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "hover:bg-muted",
        className
      )}
    >
      {children}
    </Link>
  )
}

export function OverviewPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "positive" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "positive" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700"
      )}
    >
      {children}
    </span>
  )
}

export function OverviewSection({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode
  children: React.ReactNode
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <section className="h-full border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-base font-medium text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function OverviewTile({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("border border-border bg-background p-3", className)}>
      {children}
    </div>
  )
}
