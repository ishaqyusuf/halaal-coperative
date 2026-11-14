"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import type { OverviewSummary } from "./overview-utils"

type ContributionHealthData = OverviewSummary["contributionHealth"]

export function getContributionHealthHeadline(data: ContributionHealthData) {
  if (data.state === "no_commitments") {
    return "No monthly payments are set yet."
  }

  return `${formatCurrency(data.receivedThisMonth)} of ${formatCurrency(data.expectedThisMonth)} paid`
}

export function getContributionPaidShare(data: ContributionHealthData) {
  if (data.expectedThisMonth <= 0) return 0

  return Math.min(1, data.receivedThisMonth / data.expectedThisMonth)
}

/** This month's member payments: how much is in and who has not paid. */
export function ContributionHealth({ data }: { data: ContributionHealthData }) {
  const paidShare = getContributionPaidShare(data)
  const hasCommitments = data.state !== "no_commitments"

  return (
    <section
      aria-labelledby="overview-payments-title"
      className="flex min-w-0 flex-col rounded-(--ui-radius-surface) border border-border bg-card p-5"
    >
      <h2
        className="text-xl font-semibold text-foreground"
        id="overview-payments-title"
      >
        Payments for {data.periodLabel}
      </h2>
      <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground tabular-nums">
        {getContributionHealthHeadline(data)}
      </p>
      {hasCommitments ? (
        <>
          <div
            aria-label={`${Math.round(paidShare * 100)}% paid`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(paidShare * 100)}
            className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${paidShare * 100}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-base text-muted-foreground">Paid</dt>
              <dd className="text-2xl font-semibold text-foreground tabular-nums">
                {data.paidMemberCount}
              </dd>
            </div>
            <div>
              <dt className="text-base text-muted-foreground">Not paid yet</dt>
              <dd className="text-2xl font-semibold text-foreground tabular-nums">
                {data.unpaidMemberCount}
              </dd>
            </div>
          </dl>
          {data.basis === "active_commitments" ? (
            <p className="mt-3 text-base text-muted-foreground">
              Estimated until this month's record is created.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="mt-auto pt-5">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={hasCommitments ? "/monthly-records" : "/members"}
        >
          {hasCommitments ? "See who has paid" : "Set monthly payments"}
        </Link>
      </div>
    </section>
  )
}
