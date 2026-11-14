"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import { formatShortDate, type OverviewActivityItem } from "./overview-utils"

export function getActivitySentence(item: OverviewActivityItem) {
  if (item.kind === "contribution" && item.amount !== null) {
    return `${item.memberName} paid ${formatCurrency(item.amount)}`
  }

  if (item.kind === "repayment" && item.amount !== null) {
    return `${item.memberName} repaid ${formatCurrency(item.amount)}`
  }

  return `${item.memberName} asked for a loan`
}

export function RecentActivity({ items }: { items: OverviewActivityItem[] }) {
  return (
    <section
      aria-labelledby="overview-activity-title"
      className="min-w-0 rounded-(--ui-radius-surface) border border-border bg-card p-5"
    >
      <h2
        className="text-xl font-semibold text-foreground"
        id="overview-activity-title"
      >
        Recent activity
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                className="-mx-2 flex min-h-14 flex-col justify-center gap-0.5 rounded-(--ui-radius-control) px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                href={item.href}
              >
                <span className="text-base font-medium text-foreground">
                  {getActivitySentence(item)}
                </span>
                <span className="shrink-0 text-base text-muted-foreground">
                  {formatShortDate(item.occurredAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-base text-muted-foreground">
          Payments and loan requests will show here.
        </p>
      )}
    </section>
  )
}
