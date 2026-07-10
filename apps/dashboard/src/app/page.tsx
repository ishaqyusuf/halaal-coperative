import { headers } from "next/headers"
import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getMemberByUserId,
  getMemberStatementDetail,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listFoodPurchaseApplications,
  listMemberPaymentReceipts,
  listMemberShareApplications,
  listProcurementRequests,
  listProjectFinancingRequests,
  listSupportCases,
} from "@halaalvest/db"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { TenantUrlProvider } from "@halaalvest/tenant-url/react"
import { DashboardPageFrame, WorkspaceEmptyState } from "@/components/dashboard"
import { DashboardShellClient } from "@/components/dashboard-shell"
import { MemberPortalOverview } from "@/components/member-portal-overview"
import { OverviewView } from "@/components/widgets"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function TenantHomePage() {
  const headerStore = await headers()
  const tenantUrlConfig = getDashboardTenantUrlConfig()
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    config: tenantUrlConfig,
    headers: headerStore,
  })
  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.membership) {
    const role = normalizeRole(context.auth.membership.role)
    const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
    const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"
    const runtime = createDbRuntime()

    if (
      context.tenant &&
      runtime.status === "database-configured"
    ) {
      const setupGate = await resolveInitialMigrationSetupGate({
        role: context.auth.membership.role,
        tenantId: context.tenant.id,
      })

      if (setupGate.shouldRedirectAdminToSetup) {
        return tenantRedirect("/getting-started")
      }
    }

    if (context.auth.membership.role === "member") {
      let memberPortalContent = (
        <DashboardPageFrame>
          <WorkspaceEmptyState
            body="Member dashboard data is available once the database-backed workspace is active."
            title="Member dashboard needs the database runtime."
          />
        </DashboardPageFrame>
      )

      if (
        context.tenant &&
        context.auth.user &&
        runtime.status === "database-configured"
      ) {
        const member = await getMemberByUserId({
          tenantId: context.tenant.id,
          userId: context.auth.user.id,
        })

        if (member) {
          const [detail, receipts, supportCases, sharePolicy] =
            await Promise.all([
              getMemberStatementDetail(context.tenant.id, member.id),
              listMemberPaymentReceipts(context.tenant.id, {
                memberId: member.id,
              }),
              listSupportCases({
                limit: 5,
                memberId: member.id,
                tenantId: context.tenant.id,
              }),
              getTenantSharePolicy(context.tenant.id),
            ])

          if (detail) {
            const [
              shareApplications,
              sharePosition,
              procurementRequests,
              projectFinancingRequests,
              foodPurchaseApplications,
            ] = await Promise.all([
              listMemberShareApplications({
                memberId: member.id,
                tenantId: context.tenant.id,
              }),
              sharePolicy.configurationMode === "unit_based"
                ? getMemberUnitSharePosition({
                    memberId: member.id,
                    tenantId: context.tenant.id,
                  })
                : Promise.resolve(null),
              listProcurementRequests({
                limit: 5,
                memberId: member.id,
                tenantId: context.tenant.id,
              }),
              listProjectFinancingRequests({
                limit: 5,
                memberId: member.id,
                tenantId: context.tenant.id,
              }),
              listFoodPurchaseApplications({
                limit: 5,
                memberId: member.id,
                tenantId: context.tenant.id,
              }),
            ])

            memberPortalContent = (
              <MemberPortalOverview
                detail={detail}
                foodPurchaseApplications={foodPurchaseApplications}
                procurementRequests={procurementRequests}
                projectFinancingRequests={projectFinancingRequests}
                receipts={receipts.slice(0, 5)}
                shareApplications={shareApplications.slice(0, 5)}
                sharePolicy={sharePolicy}
                sharePosition={sharePosition}
                supportCases={supportCases}
              />
            )
          }
        } else {
          memberPortalContent = (
            <DashboardPageFrame>
              <WorkspaceEmptyState
                body="Your user account is not linked to a member profile in this cooperative."
                title="Member profile not linked."
              />
            </DashboardPageFrame>
          )
        }
      }

      return (
        <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
          <DashboardShellClient
            role={role}
            tenantName={tenantName}
            userName={userName}
          >
            {memberPortalContent}
          </DashboardShellClient>
        </TenantUrlProvider>
      )
    }

    await prefetch(trpc.overview.summary.queryOptions())

    return (
      <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
        <DashboardShellClient
          role={role}
          tenantName={tenantName}
          userName={userName}
        >
          <HydrateClient>
            <OverviewView />
          </HydrateClient>
        </DashboardShellClient>
      </TenantUrlProvider>
    )
  }

  if (context.auth.sessionToken && context.auth.pendingMemberOnboarding) {
    return tenantRedirect("/awaiting-approval")
  }

  return tenantRedirect("/login")
}
