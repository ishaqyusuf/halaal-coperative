import {
  createDbRuntime,
  getOrCreateMonthlyRecordsPageData,
} from "@halaalvest/db"
import { MonthlyRecordsPageView } from "@/components/monthly-records-page-view"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function MonthlyRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const selectedRecordId =
    typeof params.recordId === "string" ? params.recordId : undefined
  const requestedYear =
    typeof params.year === "string" ? Number(params.year) : undefined

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Monthly records"
        title="Monthly records"
        description="Review monthly member payments, apply received amounts, and keep contribution and loan servicing records in sync."
      >
        <WorkspaceEmptyState
          title="Monthly records need the database runtime."
          body="Once the database-backed environment is active, this route will create monthly batches and record member payments."
        />
      </WorkspacePageShell>
    )
  }

  const canManageRecords = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles,
  )

  if (!context.auth.user || !canManageRecords) {
    return (
      <WorkspacePageShell
        eyebrow="Monthly records"
        title="Monthly records"
        description="Review monthly member payments, apply received amounts, and keep contribution and loan servicing records in sync."
      >
        <WorkspaceEmptyState
          title="You do not have access to monthly records."
          body="A finance officer, cooperative admin, or super admin role is required to manage monthly records."
        />
      </WorkspacePageShell>
    )
  }

  const data = await getOrCreateMonthlyRecordsPageData({
    actorUserId: context.auth.user.id,
    selectedRecordId,
    tenantId: context.tenant.id,
  })

  const selectedYear =
    requestedYear && Number.isInteger(requestedYear)
      ? requestedYear
      : data.selectedRecord?.periodYear ?? new Date().getUTCFullYear()

  return <MonthlyRecordsPageView {...data} selectedYear={selectedYear} />
}
