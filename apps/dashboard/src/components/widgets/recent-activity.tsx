"use client"

import { OverviewActionLink, OverviewSection } from "./overview-ui"
import {
  formatShortDate,
  type OverviewActivityItem,
} from "./overview-utils"

export function RecentActivity({
  items,
}: {
  items: OverviewActivityItem[]
}) {
  return (
    <OverviewSection
      eyebrow="Activity"
      title="Recent cooperative activity"
      description="A combined feed of posted money events and financing requests."
    >
      <div className="divide-y divide-border">
        {items.length > 0 ? (
          items.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-2 py-3 first:pt-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activity.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.detail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(activity.occurredAt)}
                </p>
                <OverviewActionLink href={activity.href} variant="ghost">
                  Open
                </OverviewActionLink>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            No recent cooperative activity is available yet.
          </p>
        )}
      </div>
    </OverviewSection>
  )
}
