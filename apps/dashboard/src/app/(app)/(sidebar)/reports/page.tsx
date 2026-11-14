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
  description: "Key figures, downloads and recent activity.",
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
        body="Reports are not available right now. Try again later."
        title="Reports are unavailable"
      />
    )
  }

  if (!hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return (
      <ReportsUnavailableView
        body="Only cooperative admins can see reports."
        title="You cannot see reports"
      />
    )
  }

  prefetch(
    trpc.reports.summary.queryOptions({
      from: resolvedDateRange?.from,
      to: resolvedDateRange?.to,
    })
  )

  return (
    <HydrateClient>
      <ReportsView filters={filters} />
    </HydrateClient>
  )
}
