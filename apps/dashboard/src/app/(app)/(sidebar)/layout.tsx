import { normalizeRole } from "@halaalvest/auth"
import { getTenantInitialMigrationState } from "@halaalvest/db"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { TenantUrlProvider } from "@halaalvest/tenant-url/react"
import { headers } from "next/headers"
import { DashboardShellClient } from "@/components/dashboard"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { canAccessDashboardPath } from "@/lib/navigation/lib"
import { getDashboardServerContext } from "@/lib/server-context"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

const initialMigrationSetupPaths = [
  "/settings/finance",
  "/settings/imports",
  "/settings/profile",
]

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

  if (!canAccessDashboardPath(nextPath, role)) {
    await tenantRedirect("/")
  }

  if (context.tenant) {
    const migrationState = await getTenantInitialMigrationState(
      context.tenant.id
    )
    const canProceed = migrationState.snapshot.canUseLiveFinancialWrites
    const isWorkspaceAdmin = hasAnyRole(
      context.auth.membership?.role,
      workspaceAdminRoles
    )
    const alreadyInSetup = initialMigrationSetupPaths.some(
      (setupPath) =>
        nextPath === setupPath || nextPath.startsWith(`${setupPath}/`)
    )

    if (!canProceed && isWorkspaceAdmin && !alreadyInSetup) {
      await tenantRedirect("/settings/finance")
    }

    if (!canProceed && !isWorkspaceAdmin) {
      const tenantName = context.tenant.name
      const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

      return (
        <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
          <DashboardShellClient
            role={role}
            tenantName={tenantName}
            userName={userName}
          >
            <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-6 py-12">
              <div className="rounded-lg border border-border/70 bg-card p-6">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Initial migration required
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-foreground">
                  Live workspace actions are locked
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This cooperative is still completing its one-time historical
                  migration. An admin must finish finance setup, member
                  backfill, and finalization before normal records can be
                  created or updated.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Current stage
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {migrationState.snapshot.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Missing steps
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {migrationState.snapshot.missingStepKeys.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </DashboardShellClient>
        </TenantUrlProvider>
      )
    }
  }

  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      <DashboardShellClient
        role={role}
        tenantName={tenantName}
        userName={userName}
      >
        {children}
      </DashboardShellClient>
    </TenantUrlProvider>
  )
}
