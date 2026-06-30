"use client"

import {
  OverviewActionLink,
  OverviewPill,
  OverviewSection,
} from "./overview-ui"
import type { OverviewComplianceItem } from "./overview-utils"

export function ComplianceWatch({
  items,
}: {
  items: OverviewComplianceItem[]
}) {
  return (
    <OverviewSection eyebrow="Compliance" title="Watch list">
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Requires staff review
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OverviewPill tone={item.count > 0 ? "warning" : "positive"}>
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
