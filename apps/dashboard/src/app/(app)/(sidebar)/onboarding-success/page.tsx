import { getTenantFinanceSetup, listMembers } from "@halaalvest/db"
import { OnboardingSuccessView } from "@/components/getting-started-page-view"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"

export default async function OnboardingSuccessPage() {
  const context = await getDashboardServerContext()
  const tenant = context.tenant
  const membership = context.auth.membership

  if (!tenant || !membership) {
    await tenantRedirect("/")
    return null
  }

  const setupGate = await resolveInitialMigrationSetupGate({
    role: membership.role,
    tenantId: tenant.id,
  })

  if (setupGate.shouldRedirectAdminToSetup) {
    await tenantRedirect("/getting-started")
  }

  if (!setupGate.isWorkspaceAdmin) {
    await tenantRedirect("/")
  }

  if (setupGate.canUseLiveWorkspace) {
    await tenantRedirect("/")
  }

  const [financeSetup, members] = await Promise.all([
    getTenantFinanceSetup(tenant.id),
    listMembers(tenant.id, { page: 1, pageSize: 200 }),
  ])
  const adminMember =
    members.items.find(
      (member: any) => member.user?.id === context.auth.user?.id
    ) ??
    members.items.find(
      (member: any) =>
        member.user?.email && member.user.email === context.auth.user?.email
    ) ??
    null

  return (
    <OnboardingSuccessView
      adminMember={
        adminMember
          ? {
              email: adminMember.user?.email ?? null,
              fullName: adminMember.fullName,
              id: adminMember.id,
              joinedAt: adminMember.joinedAt.toISOString().slice(0, 10),
              memberNumber: adminMember.memberNumber,
            }
          : null
      }
      memberOptions={members.items.map((member: any) => ({
        id: member.id,
        label: `${member.fullName} (${member.memberNumber})`,
      }))}
      migrationSetup={financeSetup.migrationSetup}
      tenantName={financeSetup.tenant?.name ?? tenant.name}
    />
  )
}
