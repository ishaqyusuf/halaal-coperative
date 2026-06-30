"use client"

import { formatCurrency } from "@halaalvest/utils"
import { OverviewPill, OverviewSection, OverviewTile } from "./overview-ui"
import type { OverviewSummary } from "./overview-utils"

export function ContributionHealth({
  data,
}: {
  data: OverviewSummary["contributionHealth"]
}) {
  return (
    <OverviewSection
      eyebrow="Collections"
      title="Contribution health"
      actions={
        <OverviewPill tone={data.collectionGap > 0 ? "warning" : "positive"}>
          {data.collectionGap > 0
            ? `${formatCurrency(data.collectionGap)} gap`
            : "Covered"}
        </OverviewPill>
      }
    >
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">Expected</dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.expectedThisMonth)}
          </dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">Received</dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.receivedThisMonth)}
          </dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">Paid members</dt>
          <dd className="mt-1 text-lg font-medium">{data.paidMemberCount}</dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">Unpaid members</dt>
          <dd className="mt-1 text-lg font-medium">{data.unpaidMemberCount}</dd>
        </OverviewTile>
      </dl>
    </OverviewSection>
  )
}
