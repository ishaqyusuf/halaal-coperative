"use client"

import {
  OverviewActionLink,
  OverviewPill,
  OverviewSection,
} from "./overview-ui"
import {
  getSeverityTone,
  type OverviewActionQueueItem,
} from "./overview-utils"

export function ActionQueue({
  items,
}: {
  items: OverviewActionQueueItem[]
}) {
  const activeItems = items.filter((item) => item.count > 0)

  return (
    <OverviewSection
      eyebrow="Today"
      title="Action queue"
      description="Work that blocks member trust, money movement, or daily operations."
      actions={
        <OverviewPill tone={activeItems.length ? "warning" : "positive"}>
          {activeItems.length
            ? `${activeItems.length} queues open`
            : "No open queues"}
        </OverviewPill>
      }
    >
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-3 py-3 first:pt-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.count === 1
                  ? "1 item requires review"
                  : `${item.count} items require review`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OverviewPill tone={getSeverityTone(item.severity)}>
                {item.count}
              </OverviewPill>
              <OverviewActionLink href={item.href} variant="ghost">
                Open
              </OverviewActionLink>
            </div>
          </div>
        ))}
      </div>
    </OverviewSection>
  )
}
