import { headers } from "next/headers"
import { getRoleDisplayName } from "@halaalvest/auth/roles"
import type { MembershipRole } from "@halaalvest/db"
import {
  getTenantMemberSignupSettings,
  listTenantUsersWithMemberships,
  listTenants,
} from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Badge } from "@halaalvest/ui/components/badge"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { buildTenantSiteHostname } from "@halaalvest/utils"
import { DevLoginFab } from "./dev-login-fab"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

function getTenantScopedMembership<
  TUser extends {
    memberships: Array<{
      isDefault: boolean
      role: MembershipRole
      tenantId: string
    }>
  },
>(user: TUser, tenantId: string) {
  const tenantMemberships = user.memberships.filter(
    (candidate) => candidate.tenantId === tenantId
  )

  if (!tenantMemberships.length) {
    return null
  }

  return (
    tenantMemberships.find((candidate) => candidate.isDefault) ??
    tenantMemberships[0]
  )
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const headerStore = await headers()
  const tenantUrlConfig = getDashboardTenantUrlConfig()
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    config: tenantUrlConfig,
    headers: headerStore,
  })
  const params = await searchParams
  const context = await getDashboardServerContext()
  const nextPath = normalizeDashboardRedirectPath(
    typeof params.next === "string" ? params.next : "/"
  )
  const error = typeof params.error === "string" ? params.error : null
  const reset = typeof params.reset === "string" ? params.reset : null
  const isDevelopment = process.env.NODE_ENV !== "production"

  if (context.auth.sessionToken && context.auth.user) {
    if (context.auth.membership && context.tenant) {
      const setupGate = await resolveInitialMigrationSetupGate({
        role: context.auth.membership.role,
        tenantId: context.tenant.id,
      })

      if (setupGate.shouldRedirectAdminToSetup) {
        await tenantRedirect("/getting-started")
      }
    }

    await tenantRedirect(nextPath)
  }

  const tenants = isDevelopment ? await listTenants() : []
  const visibleTenants = context.tenant
    ? tenants.filter((tenant) => tenant.id === context.tenant?.id)
    : tenants

  const accountGroups = isDevelopment
    ? await Promise.all(
        visibleTenants.map(async (tenant) => ({
          tenant,
          users: await listTenantUsersWithMemberships(tenant.id),
        }))
      )
    : []
  const devAccounts = accountGroups.flatMap(({ tenant, users }) =>
    users.flatMap((user) => {
      const membership = getTenantScopedMembership(user, tenant.id)

      if (!membership) {
        return []
      }

      return {
        email: user.email,
        fullName: user.fullName,
        isPlatformOwner: user.isPlatformOwner,
        roleLabel: getRoleDisplayName(membership?.role ?? null),
        tenantName: tenant.name,
        userId: user.id,
      }
    })
  )

  const tenantName = context.tenant?.name ?? "Halaalvest"
  const memberSignupSettings = context.tenant
    ? await getTenantMemberSignupSettings(context.tenant.id)
    : null
  const showMemberSignupCta =
    Boolean(context.tenant) &&
    memberSignupSettings?.memberSignupAccessMode === "public"
  const tenantHostname = context.tenant
    ? buildTenantSiteHostname(context.tenant.slug)
    : "app.halaalvest.local"
  const heroEyebrow = context.tenant ? "Tenant workspace" : "Platform access"
  const heroTitle = context.tenant
    ? `Welcome back to ${context.tenant.name}`
    : "Sign in to your cooperative workspace"
  const heroDescription = context.tenant
    ? "Members and staff sign in on the tenant host. New members can start onboarding from the same entry point."
    : "Use the tenant-specific host for workspace sign-in, or continue here while setting up and testing the platform."
  const supportCopy = context.tenant
    ? "Sessions stay scoped to this tenant host so the public site, login, and workspace remain isolated."
    : "Sessions stay host-scoped so each tenant site and the platform environment can keep separate logins."
  const loginAction = buildTenantHref(
    tenantUrlContext,
    "/auth/login",
    tenantUrlConfig
  )
  const memberSignupHref = buildTenantHref(
    tenantUrlContext,
    "/signup/members",
    tenantUrlConfig
  )
  const resetPasswordHref = buildTenantHref(
    tenantUrlContext,
    "/login/reset",
    tenantUrlConfig
  )

  return (
    <main
      className={cn(
        "bg-public-canvas flex min-h-svh flex-col text-foreground",
        isDevelopment && "bg-[#fff8df] dark:bg-[#201b0d]"
      )}
    >
      {isDevelopment ? (
        <div className="border-b border-[#d6a63a]/50 bg-[#fff2c7] px-4 py-2 text-xs font-medium text-[#0b1f36] dark:border-[#d6a63a]/40 dark:bg-[#2a240e] dark:text-[#f7faf7]">
          Development environment - quick login enabled
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-border bg-background/45 px-8 py-10 lg:flex">
          <div className="flex w-full flex-col">
            <HalaalvestLogo
              markClassName="size-9"
              wordmarkClassName="text-base tracking-normal"
            />

            <div className="mt-10 max-w-md lg:mt-20">
              <Badge variant="outline">{heroEyebrow}</Badge>
              <h1 className="mt-4 text-2xl leading-tight font-semibold text-foreground sm:text-3xl">
                {heroTitle}
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {heroDescription}
              </p>
            </div>

            <dl className="mt-8 border border-border bg-background/70 text-sm lg:mt-auto">
              <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border px-4 py-3">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="min-w-0 font-medium text-foreground">
                  {tenantName}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border px-4 py-3">
                <dt className="text-muted-foreground">Host</dt>
                <dd className="min-w-0 truncate font-medium text-foreground">
                  {tenantHostname}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Session</dt>
                <dd className="min-w-0 leading-6 text-muted-foreground">
                  {supportCopy}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="flex flex-1 items-start px-4 py-8 sm:px-6 lg:items-center lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center justify-between gap-4">
                <HalaalvestLogo
                  markClassName="size-9"
                  wordmarkClassName="text-base tracking-normal"
                />
                <Badge variant="outline">{heroEyebrow}</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {tenantHostname}
              </p>
            </div>

            <div className="border border-border bg-background p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Member and staff login
                  </p>
                  <h2 className="mt-2 text-2xl leading-tight font-semibold text-foreground">
                    Continue to your workspace
                  </h2>
                </div>
                <Badge variant="outline" className="mt-1 hidden sm:inline-flex">
                  Secure
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Enter your email and password to access the current tenant host.
              </p>

              {error === "invalid-account" ? (
                <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  The account could not be used for this tenant host, or the
                  credentials were invalid.
                </div>
              ) : null}

              {reset === "complete" ? (
                <div className="mt-5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                  Your password has been updated. Sign in with the new password.
                </div>
              ) : null}

              <form
                action={loginAction}
                method="post"
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="next" value={nextPath} />

                <label
                  className="grid gap-1.5 text-sm font-medium text-foreground"
                  htmlFor="email"
                >
                  Email
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="name@cooperative.com"
                    required
                    className="h-10 bg-background text-sm md:text-sm"
                  />
                </label>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="text-sm font-medium text-foreground"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <a
                      className="text-xs font-medium text-[#1f7a3d] underline-offset-4 hover:underline dark:text-[#71d98b]"
                      href={resetPasswordHref}
                    >
                      Reset password
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    className="h-10 bg-background text-sm md:text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full bg-[#1f7a3d] text-white hover:bg-[#176332] dark:bg-[#3fbf70] dark:text-[#071b2c] dark:hover:bg-[#71d98b]"
                >
                  Sign in
                </Button>

                {showMemberSignupCta ? (
                  <a
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "h-10 w-full border-[#1f7a3d]/35 text-[#1f7a3d] hover:bg-[#1f7a3d]/10 dark:border-[#71d98b]/45 dark:text-[#71d98b]"
                    )}
                    href={memberSignupHref}
                  >
                    Start member signup
                  </a>
                ) : null}
              </form>
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              {supportCopy}
            </p>

            {isDevelopment ? (
              <>
                <div className="mt-4 border border-[#d6a63a]/60 bg-[#fff2c7] px-3 py-2 text-xs font-medium text-[#0b1f36] dark:border-[#d6a63a]/40 dark:bg-[#2a240e] dark:text-[#f7faf7]">
                  Development mode - {devAccounts.length} quick-login account
                  {devAccounts.length === 1 ? "" : "s"} available
                </div>
                <details className="mt-3 border border-[#d6a63a]/60 bg-background/80 text-sm sm:hidden">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#0b1f36] dark:text-[#f7faf7]">
                    Quick login accounts
                  </summary>
                  <div className="space-y-3 border-t border-border p-3">
                    {devAccounts.map((account) => (
                      <form
                        key={account.userId}
                        action={loginAction}
                        method="post"
                        className="rounded-md border border-border bg-background p-3"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={account.userId}
                        />
                        <input type="hidden" name="next" value={nextPath} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {account.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {account.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{account.roleLabel}</Badge>
                            {account.isPlatformOwner ? (
                              <Badge variant="secondary">Platform owner</Badge>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          className="mt-3 w-full justify-center"
                        >
                          Login as {account.fullName}
                        </Button>
                      </form>
                    ))}
                  </div>
                </details>
              </>
            ) : null}
          </div>
        </section>
      </div>

      {isDevelopment ? (
        <DevLoginFab
          accounts={devAccounts}
          action={loginAction}
          nextPath={nextPath}
        />
      ) : null}
    </main>
  )
}
