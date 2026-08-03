import { getAuditFilterMetadata } from "@halaalvest/db"
import { resolveDateFilter } from "@halaalvest/utils"
import {
  AuditReportUnavailableView,
  AuditReportView,
} from "@/components/audit-report-view"
import { loadAuditFilterParams } from "@/hooks/use-audit-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type AuditSortField = "action" | "actor" | "entityType" | "occurredAt"

function getSort(
  sort?: string[] | null
): [AuditSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "action",
    "actor",
    "entityType",
    "occurredAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as AuditSortField, direction]
}

export default async function AuditViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const params = loadAuditFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const context = await getDashboardServerContext()

  if (
    !context.tenant ||
    !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)
  ) {
    return <AuditReportUnavailableView />
  }

  const search = params.search ?? ""
  const action = params.action ?? ""
  const resolvedDateRange = resolveDateFilter(params.dateRange)
  const [filterList, initialTableSettings, caller] = await Promise.all([
    getAuditFilterMetadata(context.tenant.id),
    getInitialTableSettings("audit"),
    getServerCaller(),
  ])
  const auditListInput = {
    action: action || undefined,
    from: resolvedDateRange?.from,
    q: search || undefined,
    sort: getSort(sort),
    to: resolvedDateRange?.to,
  }
  const auditListOptions = trpc.reports.auditEvents.infiniteQueryOptions(
    auditListInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const initialAuditPage = await caller.reports.auditEvents(auditListInput)

  getQueryClient().setQueryData(auditListOptions.queryKey, {
    pageParams: [auditListOptions.initialPageParam],
    pages: [initialAuditPage],
  })

  return (
    <HydrateClient>
      <AuditReportView
        filterList={filterList}
        initialTableSettings={initialTableSettings}
        systemCount={initialAuditPage.meta.systemCount}
        total={initialAuditPage.meta.total}
        userCount={initialAuditPage.meta.userCount}
      />
    </HydrateClient>
  )
}
