import { headers } from "next/headers"
import { normalizeRole } from "@halaalvest/auth/roles"
import { createDbRuntime } from "@halaalvest/db"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { TenantUrlProvider } from "@halaalvest/tenant-url/react"
import { DashboardShellClient } from "@/components/dashboard-shell"
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
