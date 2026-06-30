import { Badge } from "@halaalvest/ui/components/badge"
import { cn } from "@halaalvest/ui/lib/utils"

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
    <section className="border-b border-border/70 pb-5">
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
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
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
  return <div className={cn("flex flex-col gap-5", className)}>{children}</div>
}
