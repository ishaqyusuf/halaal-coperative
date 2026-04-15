import { redirect } from "next/navigation"
import { getRoleDisplayName } from "@halaal-vest/auth"
import { listTenantUsersWithMemberships, listTenants } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { Badge } from "@halaal-vest/ui/components/badge"
import { buildTenantSiteHostname } from "@halaal-vest/utils"
import { DevLoginFab } from "./dev-login-fab"
import { DashboardPageShell, DashboardPageTitle } from "@/features/workspace/page-shell"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await getDashboardServerContext()
  const nextPath = normalizeDashboardRedirectPath(typeof params.next === "string" ? params.next : "/")
  const error = typeof params.error === "string" ? params.error : null

  if (context.auth.sessionToken && context.auth.user) {
    redirect(nextPath)
  }

  const tenants = await listTenants()
  const visibleTenants = context.tenant
    ? tenants.filter((tenant) => tenant.id === context.tenant?.id)
    : tenants

  const accountGroups = await Promise.all(
    visibleTenants.map(async (tenant) => ({
      tenant,
      users: await listTenantUsersWithMemberships(tenant.id),
    })),
  )
  const devAccounts = accountGroups.flatMap(({ tenant, users }) =>
    users.map((user) => {
      const membership = user.memberships.find((candidate) => candidate.isDefault) ?? user.memberships[0]

      return {
        email: user.email,
        fullName: user.fullName,
        isPlatformOwner: user.isPlatformOwner,
        roleLabel: getRoleDisplayName(membership?.role ?? null),
        tenantName: tenant.name,
        userId: user.id,
      }
    }),
  )

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(218,119,38,0.10),_transparent_30%),linear-gradient(180deg,_rgba(255,248,239,0.98)_0%,_rgba(255,255,255,1)_38%,_rgba(248,244,237,1)_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <DashboardPageShell>
          <DashboardPageTitle
            title="Login to Dashboard"
            description="Sign in with your workspace credentials. On a cooperative tenant host, new members can also start their signup here."
          />

          {error === "invalid-account" ? (
            <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              The account could not be used for this tenant host, or the credentials were invalid.
            </div>
          ) : null}

          <section className="rounded-[1.75rem] border border-border/70 bg-background/92 p-6 shadow-sm">
            <form action="/auth/login" method="post" className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="next" value={nextPath} />
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Member and staff login</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Email and password</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Members awaiting approval can still sign in and will see their approval status screen.
                </p>
              </div>

              <label className="grid gap-2 text-sm text-foreground">
                <span>Email</span>
                <input
                  className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground/30"
                  type="email"
                  name="email"
                  placeholder="name@cooperative.com"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span>Password</span>
                <input
                  className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground/30"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" size="lg">
                  Sign in
                </Button>
                {context.tenant ? (
                  <a className="inline-flex h-8 items-center justify-center rounded-md border border-border px-4 text-xs font-medium text-foreground transition hover:bg-input/50" href="/signup/member">
                    Start member signup
                  </a>
                ) : null}
              </div>
            </form>
          </section>

          {process.env.NODE_ENV !== "production" ? (
            <div className="grid gap-6">
              {accountGroups.map(({ tenant, users }) => (
                <section
                  key={tenant.id}
                  className="rounded-[1.75rem] border border-border/70 bg-background/92 p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cooperative</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {tenant.name}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Tenant host: <span className="font-medium text-foreground">{buildTenantSiteHostname(tenant.slug)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{tenant.slug}</Badge>
                      <Badge variant="secondary">{tenant.memberCount} members</Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {users.map((user) => {
                      const membership = user.memberships.find((candidate) => candidate.isDefault) ?? user.memberships[0]

                      return (
                        <article
                          key={user.id}
                          className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4"
                        >
                          <p className="text-lg font-semibold tracking-tight text-foreground">{user.fullName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {getRoleDisplayName(membership?.role ?? null)}
                            </Badge>
                            {user.isPlatformOwner ? <Badge variant="secondary">Platform owner</Badge> : null}
                          </div>

                          <form action="/auth/login" method="post" className="mt-5">
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="next" value={nextPath} />
                            <Button type="submit" size="lg">
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

          <div className="text-sm text-muted-foreground">
            Sessions are scoped to the current host, so each tenant site and the platform app can keep separate logins.
          </div>
        </DashboardPageShell>
      </div>
      {process.env.NODE_ENV !== "production" ? (
        <DevLoginFab accounts={devAccounts} nextPath={nextPath} />
      ) : null}
    </main>
  )
}
