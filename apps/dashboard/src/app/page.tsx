import Link from "next/link"
import { headers } from "next/headers"
import { normalizeRole } from "@halaalvest/auth/roles"
import { buildDashboardSnapshot } from "@halaalvest/domain"
import { createDbRuntime, getDashboardMetrics } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { TenantUrlProvider } from "@halaalvest/tenant-url/react"
import { formatCurrency } from "@halaalvest/utils"
import { Button } from "@halaalvest/ui/components/button"
import { DashboardShellClient } from "@/components/dashboard"
import { DashboardOverviewPage } from "@/components/dashboard/overview-page"
import { getDashboardServerContext } from "@/lib/server-context"
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

    await prefetch(trpc.health.summary.queryOptions())

    return (
      <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
        <DashboardShellClient
          role={role}
          tenantName={tenantName}
          userName={userName}
        >
          <HydrateClient>
            <DashboardOverviewPage />
          </HydrateClient>
        </DashboardShellClient>
      </TenantUrlProvider>
    )
  }

  if (context.auth.sessionToken && context.auth.pendingMemberOnboarding) {
    return tenantRedirect("/awaiting-approval")
  }

  const tenant = context.tenant

  if (!tenant) {
    return tenantRedirect("/login")
  }

  const runtime = createDbRuntime()
  const dashboardMetrics =
    runtime.status === "database-configured"
      ? await getDashboardMetrics(tenant.id)
      : null
  const dashboard = buildDashboardSnapshot({
    tenant: dashboardMetrics
      ? {
          ...tenant,
          memberCount: dashboardMetrics.memberCount,
        }
      : tenant,
    policy: dashboardMetrics
      ? {
          reserveBuffer: dashboardMetrics.reserveBuffer,
        }
      : undefined,
    metrics: dashboardMetrics
      ? {
          activeLoans: dashboardMetrics.activeLoanCount,
          availablePool: dashboardMetrics.availablePool,
          collectionCoverage:
            dashboardMetrics.totalContributions > 0
              ? dashboardMetrics.availablePool / dashboardMetrics.totalContributions
              : 0,
          delinquencyRate: dashboardMetrics.delinquencyRate,
          monthlyContributionTarget: dashboardMetrics.totalContributions,
        }
      : undefined,
  })
  const memberSignupHref = buildTenantHref(
    tenantUrlContext,
    "/signup/members",
    tenantUrlConfig,
  )
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)
  const appHref = buildTenantHref(tenantUrlContext, "/", tenantUrlConfig)

  return (
    <main className="bg-public-canvas min-h-svh">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
            {tenant.slug}.halaalvest.com
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {tenant.name}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            One tenant site for public discovery, member onboarding, shared
            login, and the protected cooperative workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Members
            </p>
            <p className="mt-3 text-xl font-semibold">
              {dashboard.memberCount}
            </p>
          </article>
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Available pool
            </p>
            <p className="mt-3 text-xl font-semibold">
              {formatCurrency(dashboard.availablePool)}
            </p>
          </article>
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Reserve buffer
            </p>
            <p className="mt-3 text-xl font-semibold">
              {formatCurrency(dashboard.reserveBuffer)}
            </p>
          </article>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={memberSignupHref}>
            <Button size="lg" className="rounded-full px-5">
              Become a member
            </Button>
          </a>
          <a href={loginHref}>
            <Button size="lg" variant="outline" className="rounded-full px-5">
              Login
            </Button>
          </a>
          <Link href={appHref}>
            <Button size="lg" variant="outline" className="rounded-full px-5">
              Open app
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
