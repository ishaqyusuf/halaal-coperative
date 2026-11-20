import type { Metadata } from "next"
import { getAuditFilterMetadata } from "@halaalvest/db"
import {
  AuditReportUnavailableView,
  AuditReportView,
} from "@/components/audit-report-view"
import { loadActivityEntryParams } from "@/hooks/use-activity-entry-params"
import { loadAuditFilterParams } from "@/hooks/use-audit-filter-params"
import { getActivityListInput } from "@/lib/reports/activity-list-input"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata: Metadata = {
  title: "Activity | Halaalvest",
}

export default async function AuditViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const filters = loadAuditFilterParams(resolvedSearchParams)
  const { activityId } = loadActivityEntryParams(resolvedSearchParams)
  const context = await getDashboardServerContext()

  if (
    !context.tenant ||
    !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)
  ) {
    return <AuditReportUnavailableView />
  }

  prefetch(
    trpc.reports.auditTimeline.infiniteQueryOptions(
      getActivityListInput(filters),
      { getNextPageParam: ({ meta }) => meta?.cursor }
    )
  )
  if (activityId && uuidPattern.test(activityId)) {
    prefetch(trpc.reports.auditEvent.queryOptions({ id: activityId }))
  }

  return (
    <HydrateClient>
      <AuditReportView filterList={await getAuditFilterMetadata()} />
    </HydrateClient>
  )
}
