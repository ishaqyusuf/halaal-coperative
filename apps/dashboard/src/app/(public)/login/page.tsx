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
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { buildTenantSiteHostname } from "@halaalvest/utils"
import { DevLoginFab } from "./dev-login-fab"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { getDashboardServerContext } from "@/lib/server-context"
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

  if (context.auth.sessionToken && context.auth.user) {
    await tenantRedirect(nextPath)
  }

  const tenants = await listTenants()
  const visibleTenants = context.tenant
    ? tenants.filter((tenant) => tenant.id === context.tenant?.id)
    : tenants

  const accountGroups = await Promise.all(
    visibleTenants.map(async (tenant) => ({
      tenant,
      users: await listTenantUsersWithMemberships(tenant.id),
    }))
  )
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

  const tenantName = context.tenant?.name ?? "HalaalVest"
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
  const loginAction = buildTenantHref(tenantUrlContext, "/auth/login", tenantUrlConfig)
  const memberSignupHref = buildTenantHref(
    tenantUrlContext,
    "/signup/members",
    tenantUrlConfig,
  )
  const resetPasswordHref = buildTenantHref(
    tenantUrlContext,
    "/login/reset",
    tenantUrlConfig
  )

  return (
    <main className="min-h-svh bg-public-canvas">
      <div className="flex min-h-svh flex-col lg:flex-row">
        <section className="relative hidden lg:flex lg:w-1/2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,188,136,0.32),transparent_42%),linear-gradient(180deg,rgba(32,24,17,0.08),rgba(32,24,17,0.02))]" />
          <div className="relative flex w-full flex-col justify-between overflow-hidden border-r border-border/60 px-10 py-8 xl:px-14 xl:py-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {heroEyebrow}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tenantHostname}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Secure access
              </Badge>
            </div>

            <div className="max-w-xl">
              <h1 className="max-w-lg text-4xl font-semibold tracking-[-0.04em] text-foreground xl:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                {heroDescription}
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <article className="rounded-[1.75rem] border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Login flow
                  </p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                    One sign-in for members and staff
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pending member accounts can still sign in and will land on
                    their approval status screen.
                  </p>
                </article>
                <article className="rounded-[1.75rem] border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Onboarding
                  </p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                    Tenant-scoped access only
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Public site, authentication, and workspace stay aligned to
                    the current cooperative host.
                  </p>
                </article>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-background/85 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Workspace
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {tenantName}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {supportCopy}
              </p>
            </div>
          </div>
        </section>

        <section className="flex w-full flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-10 lg:py-10">
          <div className="mx-auto flex w-full max-w-md flex-col">
            <div className="mb-8 lg:hidden">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {heroEyebrow}
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {heroTitle}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {heroDescription}
              </p>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-background/94 p-6 shadow-[0_24px_80px_rgba(88,52,24,0.08)] backdrop-blur sm:p-8">
              <div className="space-y-2 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Member and staff login
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Continue to your workspace
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email and password to access the current tenant
                  host.
                </p>
              </div>

              {error === "invalid-account" ? (
                <div className="mt-6 rounded-[1.25rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  The account could not be used for this tenant host, or the
                  credentials were invalid.
                </div>
              ) : null}

              {reset === "complete" ? (
                <div className="mt-6 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                  Your password has been updated. Sign in with the new
                  password.
                </div>
              ) : null}

              <form action={loginAction} method="post" className="mt-6 space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <label className="grid gap-2 text-sm text-foreground">
                  <span>Email</span>
                  <Input
                    type="email"
                    name="email"
                    placeholder="name@cooperative.com"
                    required
                    className="h-11"
                  />
                </label>

                <label className="grid gap-2 text-sm text-foreground">
                  <span>Password</span>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    className="h-11"
                  />
                </label>

                <Button type="submit" size="lg" className="mt-2 w-full">
                  Sign in
                </Button>

                <a
                  className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={resetPasswordHref}
                >
                  Reset password
                </a>

                {showMemberSignupCta ? (
                  <a
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "w-full"
                    )}
                    href={memberSignupHref}
                  >
                    Start member signup
                  </a>
                ) : null}
              </form>

              <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs leading-5 text-muted-foreground">
                {supportCopy}
              </div>
            </div>

            {process.env.NODE_ENV !== "production" ? (
              <div className="mt-6 space-y-4">
                {accountGroups.map(({ tenant, users }) => (
                  <section
                    key={tenant.id}
                    className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-border/60 pb-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Dev quick access
                        </p>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                          {tenant.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {buildTenantSiteHostname(tenant.slug)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{tenant.slug}</Badge>
                        <Badge variant="secondary">
                          {tenant.memberCount} members
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {users.map((user) => {
                        const membership = getTenantScopedMembership(
                          user,
                          tenant.id
                        )

                        if (!membership) {
                          return null
                        }

                        return (
                          <article
                            key={user.id}
                            className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {user.fullName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <Badge variant="outline">
                                  {getRoleDisplayName(membership?.role ?? null)}
                                </Badge>
                                {user.isPlatformOwner ? (
                                  <Badge variant="secondary">
                                    Platform owner
                                  </Badge>
                                ) : null}
                              </div>
                            </div>

                            <form
                              action={loginAction}
                              method="post"
                              className="mt-4"
                            >
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <input type="hidden" name="next" value={nextPath} />
                              <Button
                                type="submit"
                                variant="outline"
                                className="w-full justify-center"
                              >
                                Continue as {user.fullName}
                              </Button>
                            </form>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {process.env.NODE_ENV !== "production" ? (
        <DevLoginFab
          accounts={devAccounts}
          action={loginAction}
          nextPath={nextPath}
        />
      ) : null}
    </main>
  )
}
