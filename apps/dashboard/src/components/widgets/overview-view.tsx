"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"
import { ActionQueue } from "./action-queue"
import { ComplianceWatch } from "./compliance-watch"
import { ContributionHealth } from "./contribution-health"
import { FinancingRisk } from "./financing-risk"
import { OverviewActionLink } from "./overview-ui"
import { RecentActivity } from "./recent-activity"
import { SetupWarnings } from "./setup-warnings"
import { ShareProfitPosition } from "./share-profit-position"
import { WidgetCards } from "./widget-cards"

export function OverviewView() {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(trpc.overview.summary.queryOptions())

  return (
    <div className="flex flex-col gap-5">
      <section className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Overview
            </p>
            <h1 className="mt-3 text-2xl font-medium text-foreground sm:text-3xl">
              {data.workspace.tenantName} operations
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Daily finance posture, member operations, and
              compliance-sensitive work that needs staff attention.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <OverviewActionLink href="/membership-approvals">
              Review approvals
            </OverviewActionLink>
            <OverviewActionLink href="/repayments">
              Open collections
            </OverviewActionLink>
          </div>
        </div>
      </section>

      <SetupWarnings warnings={data.setupWarnings} />

      <WidgetCards data={data} />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ActionQueue items={data.actionQueue} />
        <ContributionHealth data={data.contributionHealth} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <FinancingRisk data={data.financingRisk} />
        <ComplianceWatch items={data.complianceWatch} />
        <ShareProfitPosition data={data.shareAndProfitPosition} />
      </section>

      <RecentActivity items={data.recentActivity} />
    </div>
  )
}
