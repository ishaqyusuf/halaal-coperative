"use client"

import { formatCurrency } from "@halaalvest/utils"
import { OverviewSection, OverviewTile } from "./overview-ui"
import type { OverviewSummary } from "./overview-utils"

export function ShareProfitPosition({
  data,
}: {
  data: OverviewSummary["shareAndProfitPosition"]
}) {
  return (
    <OverviewSection eyebrow="Shares" title="Share and profit position">
      <dl className="mt-4 space-y-3">
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">
            Share capital balance
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.shareCapitalBalance)}
          </dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">
            Profit pending allocation
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.profitPendingAllocation)}
          </dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">
            Active investment pools
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {data.activeInvestmentPoolCount}
          </dd>
        </OverviewTile>
      </dl>
    </OverviewSection>
  )
}
