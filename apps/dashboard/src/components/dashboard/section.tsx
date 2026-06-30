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
        "rounded-lg border border-border/70 bg-background p-4 sm:p-5",
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
    <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 text-base font-semibold tracking-normal text-foreground sm:text-lg">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
        "rounded-md border border-border/70 bg-background p-3",
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
        "rounded-md",
        className,
      )}
    >
      {children}
    </Link>
  )
}
