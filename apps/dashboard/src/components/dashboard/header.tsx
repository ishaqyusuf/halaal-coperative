import { Badge } from "@halaal-vest/ui/components/badge"
import { cn } from "@halaal-vest/ui/lib/utils"

export function DashboardPageHeader({
  actions,
  badge,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode
  badge?: string
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <section className="rounded-[28px] border border-border/70 bg-card px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            {badge ? (
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-[11px]"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[32px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </section>
  )
}

export function DashboardPageStack({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>
}
