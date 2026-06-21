import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"

export function DashboardSectionCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6",
        className
      )}
    >
      {children}
    </section>
  )
}

export function DashboardSectionHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function DashboardSurfaceCard({
  as: Component = "div",
  children,
  className,
  id,
}: {
  as?: "article" | "div" | "section"
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <Component
      id={id}
      className={cn(
        "rounded-2xl border border-border/70 bg-muted/25 p-4",
        className,
      )}
    >
      {children}
    </Component>
  )
}

export function DashboardActionLink({
  href,
  children,
  className,
  size = "sm",
  variant = "outline",
}: {
  href: string
  children: React.ReactNode
  className?: string
  size?: "sm" | "lg" | "default"
  variant?: "outline" | "ghost" | "secondary"
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ size, variant }),
        "rounded-full",
        className,
      )}
    >
      {children}
    </Link>
  )
}
