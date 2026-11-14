"use client"

import type { CooperativeRole } from "@halaalvest/auth/roles"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { getOverviewAttentionItems } from "@/lib/dashboard/overview-attention"
import { canAccessDashboardPath } from "@/lib/navigation/lib"
import { useTRPC } from "@/trpc/client"
import { ActionQueue } from "./action-queue"
import { ContributionHealth } from "./contribution-health"
import { RecentActivity } from "./recent-activity"
import { SetupWarnings } from "./setup-warnings"
import { WidgetCards } from "./widget-cards"

export function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? ""
}

export function getAttentionSummary(total: number) {
  if (total === 0) return "Nothing needs your attention today."

  return total === 1
    ? "1 thing needs your attention."
    : `${total} things need your attention.`
}

export function OverviewView({
  role,
  userName,
}: {
  role: CooperativeRole | null
  userName: string
}) {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(trpc.overview.summary.queryOptions())
  const attentionItems = getOverviewAttentionItems(data.actionQueue, role)
  const attentionTotal = attentionItems.reduce(
    (total, item) => total + item.count,
    0
  )
  const firstName = getFirstName(userName)
  const canRecordPayments = canAccessDashboardPath("/monthly-records", role)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="mt-1 text-lg text-muted-foreground">
            {attentionTotal > 0 ? (
              <a
                className="font-medium text-foreground underline underline-offset-4"
                href="#needs-attention"
              >
                {getAttentionSummary(attentionTotal)}
              </a>
            ) : (
              getAttentionSummary(0)
            )}
          </p>
        </div>
        {canRecordPayments ? (
          <Link
            className={buttonVariants({ variant: "default" })}
            href="/monthly-records"
          >
            Record payments
          </Link>
        ) : null}
      </section>

      <SetupWarnings warnings={data.setupWarnings} />

      <WidgetCards data={data} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ActionQueue items={attentionItems} />
        <ContributionHealth data={data.contributionHealth} />
      </div>

      <RecentActivity items={data.recentActivity} />
    </div>
  )
}
