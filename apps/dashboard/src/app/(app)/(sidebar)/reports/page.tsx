import type { Metadata } from "next"
import { createDbRuntime } from "@halaalvest/db"
import { resolveDateFilter } from "@halaalvest/utils"
import {
  ReportsUnavailableView,
  ReportsView,
} from "@/components/reports/reports-view"
import { loadReportsFilterParams } from "@/hooks/use-reports-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  description:
    "Cooperative finance, audit, collections, notification, and compliance reporting.",
  title: "Reports | Halaalvest",
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = loadReportsFilterParams(await searchParams)
  const resolvedDateRange = resolveDateFilter(filters.dateRange)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <ReportsUnavailableView
        body="Once the database-backed environment is active, this route will surface audit activity, notification delivery stats, and finance snapshots."
        title="Reporting needs the database runtime."
      />
    )
  }

  if (!hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return (
      <ReportsUnavailableView
        body="Cooperative admins and super admins can access audit and reporting surfaces."
        title="Report access is limited."
      />
    )
  }

  await Promise.all([
    prefetch(
      trpc.reports.summary.queryOptions({
        from: resolvedDateRange?.from,
        to: resolvedDateRange?.to,
      })
    ),
    prefetch(trpc.filters.reports.queryOptions()),
  ])

  return (
    <HydrateClient>
      <ReportsView filters={filters} />
    </HydrateClient>
  )
}
