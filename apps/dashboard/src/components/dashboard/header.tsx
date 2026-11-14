"use client"

import { cn } from "@halaalvest/ui/lib/utils"
import { shouldShowPageHeaderTitle } from "@/lib/navigation/lib"
import { useDashboardRouteTitle } from "./route-title-context"

/**
 * The top bar already shows the page title as the page's h1. This header adds
 * a title only when it names something more specific (a member, a statement),
 * then a short description and the page actions.
 *
 * `eyebrow` and `badge` are accepted for older callers and no longer shown.
 */
export function DashboardPageHeader({
  actions,
  description,
  title,
}: {
  actions?: React.ReactNode
  badge?: string
  description?: string
  eyebrow?: string
  title: string
}) {
  const routeTitle = useDashboardRouteTitle()
  const showTitle = routeTitle
    ? shouldShowPageHeaderTitle({
        isSectionRoot: routeTitle.isSectionRoot,
        routeTitle: routeTitle.pageTitle,
        title,
      })
    : true

  if (!showTitle && !description && !actions) {
    return null
  }

  return (
    <section
      className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      data-page-header
    >
      <div className="min-w-0">
        {showTitle ? (
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p
            className={cn(
              "max-w-3xl text-base leading-7 text-muted-foreground",
              showTitle && "mt-2"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
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
