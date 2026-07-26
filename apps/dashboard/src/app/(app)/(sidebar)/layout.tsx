import { normalizeRole } from "@halaalvest/auth/roles"
import { getTenantFirstRunOnboardingState } from "@halaalvest/db"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import {
  TenantUrlProvider,
  TenantUrlVariantSwitcher,
} from "@halaalvest/tenant-url/react"
import { headers } from "next/headers"
import { DashboardShellClient } from "@/components/dashboard-shell"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { canAccessDashboardPath } from "@/lib/navigation/lib"
import { getOperationProfileHiddenNavPaths } from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  isInitialMigrationSetupPath,
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

  if (!canAccessDashboardPath(nextPath, role)) {
    await tenantRedirect("/")
  }

  if (context.tenant) {
    const setupGate = await resolveInitialMigrationSetupGate({
      role: context.auth.membership?.role,
      tenantId: context.tenant.id,
    })
    const alreadyInSetup = isInitialMigrationSetupPath(nextPath)

    if (setupGate.shouldRedirectAdminToSetup && !alreadyInSetup) {
      await tenantRedirect("/getting-started")
    }

    if (setupGate.shouldRedirectAdminToSuccess && !alreadyInSetup) {
      await tenantRedirect("/onboarding-success")
    }

    if (!setupGate.canUseLiveWorkspace && !setupGate.isWorkspaceAdmin) {
      const tenantName = context.tenant.name
      const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

      return (
        <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
          <DashboardShellClient
            hiddenNavPaths={hiddenNavPaths}
            role={role}
            tenantName={tenantName}
            userName={userName}
          >
            <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-6 py-12">
              <div className="rounded-lg border border-border/70 bg-card p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
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
                      {setupGate.migrationState?.snapshot.status.replaceAll(
                        "_",
                        " "
                      ) ?? "setup required"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Missing steps
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {setupGate.migrationState?.snapshot.missingStepKeys
                        .length ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </DashboardShellClient>
          <TenantUrlVariantSwitcher />
        </TenantUrlProvider>
      )
    }

    const alreadyInOnboarding =
      nextPath === "/onboarding" || nextPath.startsWith("/onboarding/")

    if (
      setupGate.canUseLiveWorkspace &&
      setupGate.isWorkspaceAdmin &&
      !alreadyInOnboarding
    ) {
      const firstRunOnboarding = await getTenantFirstRunOnboardingState(
        context.tenant.id
      )

      if (firstRunOnboarding.shouldOpenForEmptyWorkspace) {
        await tenantRedirect("/onboarding")
      }
    }
  }

  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      <DashboardShellClient
        hiddenNavPaths={hiddenNavPaths}
        role={role}
        tenantName={tenantName}
        userName={userName}
      >
        {children}
      </DashboardShellClient>
      <TenantUrlVariantSwitcher />
    </TenantUrlProvider>
  )
}
