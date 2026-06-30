"use client"

import { formatCurrency } from "@halaalvest/utils"
import { OverviewSection, OverviewTile } from "./overview-ui"
import type { OverviewSummary } from "./overview-utils"

export function FinancingRisk({
  data,
}: {
  data: OverviewSummary["financingRisk"]
}) {
  return (
    <OverviewSection eyebrow="Risk" title="Financing exposure">
      <dl className="mt-4 space-y-3">
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">
            Outstanding principal
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.outstandingPrincipal)}
          </dd>
        </OverviewTile>
        <OverviewTile>
          <dt className="text-xs text-muted-foreground">Overdue amount</dt>
          <dd className="mt-1 text-lg font-medium">
            {formatCurrency(data.overdueAmount)}
          </dd>
        </OverviewTile>
        <div className="grid gap-3 sm:grid-cols-3">
          <OverviewTile>
            <dt className="text-xs text-muted-foreground">PAR 30</dt>
            <dd className="mt-1 font-medium">
              {formatCurrency(data.par30Amount)}
            </dd>
          </OverviewTile>
          <OverviewTile>
            <dt className="text-xs text-muted-foreground">PAR 60</dt>
            <dd className="mt-1 font-medium">
              {formatCurrency(data.par60Amount)}
            </dd>
          </OverviewTile>
          <OverviewTile>
            <dt className="text-xs text-muted-foreground">PAR 90</dt>
            <dd className="mt-1 font-medium">
              {formatCurrency(data.par90Amount)}
            </dd>
          </OverviewTile>
        </div>
      </dl>
    </OverviewSection>
  )
}
