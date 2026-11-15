import type { Metadata } from "next"
import { headers } from "next/headers"
import { Suspense } from "react"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import {
  TenantUrlProvider,
  TenantUrlVariantSwitcher,
} from "@halaalvest/tenant-url/react"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { DashboardHomeSkeleton } from "@/components/dashboard-home-page-states"
import { DashboardShellClient } from "@/components/dashboard-shell"
import { GoLiveBanner } from "@/components/go-live-banner"
import { MemberPortalOverview } from "@/components/member-portal-overview"
import { OverviewView } from "@/components/widgets"
import { OverviewSkeleton } from "@/components/widgets/overview-skeleton"
import { loadTenantHomePageData } from "@/lib/dashboard/load-tenant-home-page"
import {
  formatMemberSignInHost,
  getGoLiveBannerMessage,
  goLiveBannerParam,
} from "@/lib/getting-started/go-live-readiness"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export const metadata: Metadata = {
  title: "Home | Halaalvest",
}

type TenantHomeSearchParams = Promise<
  Record<string, string | string[] | undefined>
>

async function TenantHomePageContent({
  searchParams,
}: {
  searchParams: TenantHomeSearchParams
}) {
  const [headerStore, params] = await Promise.all([headers(), searchParams])
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
      <WorkspaceEmptyState
        body="Your account is not ready yet. Please try again later."
        title="Your records are not available"
      />
    )

    if (data.state === "member-profile-missing") {
      memberPortalContent = (
        <WorkspaceEmptyState
          body="Your sign-in is not linked to a member record here. Please contact your cooperative."
          title="We could not find your member record"
        />
      )
    }

    if (data.state === "member-ready") {
      memberPortalContent = (
        <MemberPortalOverview
          canSendReceipt={data.canSendReceipt}
          operationalReadiness={data.operationalReadiness}
          snapshot={data.snapshot}
        />
      )
    }

    return (
      <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
        <DashboardShellClient
          hiddenNavPaths={data.hiddenNavPaths}
          isPlatformOwner={data.isPlatformOwner}
          role={data.role}
          showLegalReminder={data.showLegalReminder}
          showSetupNav={data.showSetupNav}
          tenantName={data.tenantName}
          userName={data.userName}
        >
          {memberPortalContent}
        </DashboardShellClient>
        <TenantUrlVariantSwitcher />
      </TenantUrlProvider>
    )
  }

  prefetch(trpc.overview.summary.queryOptions())

  // Shown once after "Go live" redirects here with `?live=1`.
  const goLiveBannerMessage =
    params[goLiveBannerParam] === "1"
      ? getGoLiveBannerMessage({
          signInHost: formatMemberSignInHost({
            externalBasePath: tenantUrlContext.externalBasePath,
            host: tenantUrlContext.host,
          }),
          tenantName: data.tenantName,
        })
      : null

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      <DashboardShellClient
        hiddenNavPaths={data.hiddenNavPaths}
        isPlatformOwner={data.isPlatformOwner}
        role={data.role}
        showLegalReminder={data.showLegalReminder}
        showSetupNav={data.showSetupNav}
        tenantName={data.tenantName}
        userName={data.userName}
      >
        {goLiveBannerMessage ? (
          <GoLiveBanner message={goLiveBannerMessage} />
        ) : null}
        <HydrateClient>
          <Suspense fallback={<OverviewSkeleton />}>
            <OverviewView role={data.role} userName={data.userName} />
          </Suspense>
        </HydrateClient>
      </DashboardShellClient>
      <TenantUrlVariantSwitcher />
    </TenantUrlProvider>
  )
}

export default function TenantHomePage({
  searchParams,
}: {
  searchParams: TenantHomeSearchParams
}) {
  return (
    <Suspense fallback={<DashboardHomeSkeleton />}>
      <TenantHomePageContent searchParams={searchParams} />
    </Suspense>
  )
}
