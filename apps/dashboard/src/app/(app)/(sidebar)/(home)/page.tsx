import type { Metadata } from "next"
import { headers } from "next/headers"
import { Suspense } from "react"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { WorkspaceEmptyState } from "@/components/dashboard"
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

/**
 * Home renders inside the `(sidebar)` layout like every other page (WP16):
 * the layout owns sign-in, the setup gate (including the "still being set
 * up" card before go-live) and the shell, so client navigations to and from
 * home keep the sidebar mounted.
 */
export default async function TenantHomePage({
  searchParams,
}: {
  searchParams: TenantHomeSearchParams
}) {
  const data = await loadTenantHomePageData()

  if (data.state === "redirect") {
    return tenantRedirect(data.href)
  }

  if (data.state === "member-unavailable") {
    return (
      <WorkspaceEmptyState
        body="Your account is not ready yet. Please try again later."
        title="Your records are not available"
      />
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspaceEmptyState
        body="Your sign-in is not linked to a member record here. Please contact your cooperative."
        title="We could not find your member record"
      />
    )
  }

  if (data.state === "member-ready") {
    return (
      <MemberPortalOverview
        canSendReceipt={data.canSendReceipt}
        isReady={data.isReady}
        snapshot={data.snapshot}
      />
    )
  }

  prefetch(trpc.overview.summary.queryOptions())

  const [headerStore, params] = await Promise.all([headers(), searchParams])
  // Shown once after "Go live" redirects here with `?live=1`.
  let goLiveBannerMessage: string | null = null

  if (params[goLiveBannerParam] === "1") {
    const tenantUrlContext = resolveTenantUrlContextFromHeaders({
      config: getDashboardTenantUrlConfig(),
      headers: headerStore,
    })
    goLiveBannerMessage = getGoLiveBannerMessage({
      signInHost: formatMemberSignInHost({
        externalBasePath: tenantUrlContext.externalBasePath,
        host: tenantUrlContext.host,
      }),
      tenantName: data.tenantName,
    })
  }

  return (
    <>
      {goLiveBannerMessage ? (
        <GoLiveBanner message={goLiveBannerMessage} />
      ) : null}
      <HydrateClient>
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewView role={data.role} userName={data.userName} />
        </Suspense>
      </HydrateClient>
    </>
  )
}
