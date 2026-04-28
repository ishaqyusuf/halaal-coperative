import { createDbRuntime, listChargeApplications, listChargeDefinitions, listMembers } from "@halaal-vest/db"
import { ChargesPageView } from "@/components/charges-page-view"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function ChargesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageCharges = hasAnyRole(context.auth.membership?.role, financeManagementRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Charges"
        title="Charge definitions"
        description="Standard cooperative levies and charge rules for onboarding, contributions, lending, and corrective finance actions."
      >
        <WorkspaceEmptyState
          title="Charge definitions need the database runtime."
          body="This workspace is wired into the new dashboard shell and will show tenant charge definitions once the database-backed environment is active."
        />
      </WorkspacePageShell>
    )
  }

  const [charges, members, chargeApplications] = await Promise.all([
    listChargeDefinitions(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listChargeApplications(context.tenant.id, { limit: 20 }),
  ])

  const activeCharges = charges.filter((charge) => charge.isActive)
  const monthlyLevies = charges.filter((charge) => charge.isMonthlyLevy)
  const postedApplications = chargeApplications.filter((application) => application.status === "posted")

  return <ChargesPageView activeCharges={activeCharges} canManageCharges={canManageCharges} chargeApplications={chargeApplications} charges={charges} members={members} monthlyLevies={monthlyLevies} postedApplications={postedApplications} />
}
