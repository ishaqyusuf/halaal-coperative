import { normalizeRole } from "@halaalvest/auth/roles"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import {
  TenantUrlProvider,
  TenantUrlVariantSwitcher,
} from "@halaalvest/tenant-url/react"
import { headers } from "next/headers"
import { DashboardShellClient } from "@/components/dashboard-shell"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { loadShowLegalReminder } from "@/lib/dashboard/legal-reminder"
import { canAccessDashboardPath } from "@/lib/navigation/lib"
import { getOperationProfileHiddenNavPaths } from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  resolveInitialMigrationLayoutRedirect,
  resolveInitialMigrationSetupGate,
} from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function SidebarLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const tenantUrlConfig = getDashboardTenantUrlConfig()
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    config: tenantUrlConfig,
    headers: headerStore,
  })
  const context = await getDashboardServerContext()
  const nextPath = normalizeDashboardRedirectPath(headerStore.get("x-pathname"))
  const reviewingPlatformDocuments = nextPath === "/settings/platform-documents"

  if (!context.auth.sessionToken || !context.auth.user) {
    await tenantRedirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  if (!context.auth.membership && context.auth.pendingMemberOnboarding) {
    await tenantRedirect("/awaiting-approval")
  }

  if (!context.auth.membership && !context.auth.user?.isPlatformOwner) {
    await tenantRedirect(
      `/login?next=${encodeURIComponent(nextPath)}&error=invalid-account`
    )
  }

  const role = normalizeRole(context.auth.membership?.role ?? null)
  const hiddenNavPaths = await getOperationProfileHiddenNavPaths({
    role,
    tenantId: context.tenant?.id,
    userId: context.auth.user?.id,
  })

  // Runs on full page loads only: client navigations skip this layout, so
  // `proxy.ts` enforces the same check on every request (WP6).
  if (!canAccessDashboardPath(nextPath, role)) {
    await tenantRedirect("/")
  }

  // Reused by the sidebar to label the destinations this gate redirects.
  let shouldRedirectAdminToSetup = false
  // Admins keep a Getting started link until the cooperative goes live.
  let showSetupNav = false

  if (context.tenant) {
    const setupGate = await resolveInitialMigrationSetupGate({
      role: context.auth.membership?.role,
      tenantId: context.tenant.id,
    })
    shouldRedirectAdminToSetup = setupGate.shouldRedirectAdminToSetup
    showSetupNav = setupGate.isWorkspaceAdmin && !setupGate.canUseLiveWorkspace
    const setupRedirect = resolveInitialMigrationLayoutRedirect({
      pathname: nextPath,
      shouldRedirectAdminToSetup: setupGate.shouldRedirectAdminToSetup,
      shouldRedirectAdminToSuccess: setupGate.shouldRedirectAdminToSuccess,
    })

    if (setupRedirect) {
      await tenantRedirect(setupRedirect)
    }

    if (
      !setupGate.canUseLiveWorkspace &&
      !setupGate.isWorkspaceAdmin &&
      !reviewingPlatformDocuments
    ) {
      const tenantName = context.tenant.name
      const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

      return (
        <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
          <DashboardShellClient
            hiddenNavPaths={hiddenNavPaths}
            isPlatformOwner={Boolean(context.auth.user?.isPlatformOwner)}
            role={role}
            tenantName={tenantName}
            userName={userName}
          >
            <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center px-4 py-12 sm:px-6">
              <div className="rounded-lg border border-border/70 bg-card p-6 sm:p-8">
                {/* The top bar is the page's only <h1> (ADR-20261114 one page title). */}
                <h2 className="text-2xl text-foreground">
                  {tenantName} is still being set up
                </h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  Your admin is finishing setup. You can use the workspace once
                  it goes live.
                </p>
              </div>
            </main>
          </DashboardShellClient>
          <TenantUrlVariantSwitcher />
        </TenantUrlProvider>
      )
    }
  }

  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"
  const showLegalReminder = await loadShowLegalReminder({
    hasMembership: Boolean(context.auth.membership),
    tenantId: context.tenant?.id,
    userId: context.auth.user?.id,
  })

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      <DashboardShellClient
        hiddenNavPaths={hiddenNavPaths}
        isPlatformOwner={Boolean(context.auth.user?.isPlatformOwner)}
        role={role}
        shouldRedirectAdminToSetup={shouldRedirectAdminToSetup}
        showLegalReminder={showLegalReminder}
        showSetupNav={showSetupNav}
        tenantName={tenantName}
        userName={userName}
      >
        {children}
      </DashboardShellClient>
      <TenantUrlVariantSwitcher />
    </TenantUrlProvider>
  )
}
