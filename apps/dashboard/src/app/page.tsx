import { headers } from "next/headers"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { TenantUrlProvider } from "@halaalvest/tenant-url/react"
import { DashboardPageFrame, WorkspaceEmptyState } from "@/components/dashboard"
import { DashboardShellClient } from "@/components/dashboard-shell"
import { MemberPortalOverview } from "@/components/member-portal-overview"
import { OverviewView } from "@/components/widgets"
import { loadTenantHomePageData } from "@/lib/dashboard/load-tenant-home-page"
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
  const data = await loadTenantHomePageData()

  if (data.state === "redirect") {
    return tenantRedirect(data.href)
  }

  if (
    data.state === "member-unavailable" ||
    data.state === "member-profile-missing" ||
    data.state === "member-ready"
  ) {
    let memberPortalContent = (
      <DashboardPageFrame>
        <WorkspaceEmptyState
          body="Member dashboard data is available once the database-backed workspace is active."
          title="Member dashboard needs the database runtime."
        />
      </DashboardPageFrame>
    )

    if (data.state === "member-profile-missing") {
      memberPortalContent = (
        <DashboardPageFrame>
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </DashboardPageFrame>
      )
    }

    if (data.state === "member-ready") {
      memberPortalContent = (
        <MemberPortalOverview
          canShowFoodPurchase={data.canShowFoodPurchase}
          canShowProcurement={data.canShowProcurement}
          detail={data.detail}
          foodPurchaseApplications={data.foodPurchaseApplications}
          procurementRequests={data.procurementRequests}
          projectFinancingRequests={data.projectFinancingRequests}
          receipts={data.receipts}
          shareApplications={data.shareApplications}
          sharePolicy={data.sharePolicy}
          sharePosition={data.sharePosition}
          supportCases={data.supportCases}
        />
      )
    }

    return (
      <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
        <DashboardShellClient
          hiddenNavPaths={data.hiddenNavPaths}
          role={data.role}
          tenantName={data.tenantName}
          userName={data.userName}
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
        hiddenNavPaths={data.hiddenNavPaths}
        role={data.role}
        tenantName={data.tenantName}
        userName={data.userName}
      >
        <HydrateClient>
          <OverviewView />
        </HydrateClient>
      </DashboardShellClient>
    </TenantUrlProvider>
  )
}
