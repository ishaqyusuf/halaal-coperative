"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import { OverviewPill, OverviewSection, OverviewTile } from "./overview-ui"
import type { OverviewSummary } from "./overview-utils"

type ContributionHealthData = OverviewSummary["contributionHealth"]

export function getContributionHealthPill(data: ContributionHealthData): {
  label: string
  tone: "neutral" | "positive" | "warning"
} {
  if (data.state === "no_commitments") {
    return { label: "No commitments yet", tone: "neutral" }
  }

  if (data.state === "gap") {
    return { label: `${formatCurrency(data.collectionGap)} gap`, tone: "warning" }
  }

  return { label: "Covered", tone: "positive" }
}

export function getContributionHealthNote(
  data: ContributionHealthData
): string | null {
  if (data.state === "no_commitments") {
    return data.basis === "monthly_record"
      ? `Nothing is payable on the ${data.periodLabel} monthly record.`
      : `No active member has a monthly commitment for ${data.periodLabel}, so nothing is expected yet.`
  }

  if (data.basis === "active_commitments") {
    return `Estimated from active commitments and contributions posted in ${data.periodLabel}. Generate the monthly record for exact figures.`
  }

  return null
}

export function ContributionHealth({ data }: { data: ContributionHealthData }) {
  const pill = getContributionHealthPill(data)
  const note = getContributionHealthNote(data)

  return (
    <OverviewSection
      eyebrow="Collections"
      title="Contribution health"
      actions={<OverviewPill tone={pill.tone}>{pill.label}</OverviewPill>}
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
      {note ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {note}{" "}
          {data.state === "no_commitments" ? (
            <Link className="font-medium text-foreground underline" href="/members">
              Set member commitments
            </Link>
          ) : (
            <Link
              className="font-medium text-foreground underline"
              href="/monthly-records"
            >
              Monthly records
            </Link>
          )}
        </p>
      ) : null}
    </OverviewSection>
  )
}
