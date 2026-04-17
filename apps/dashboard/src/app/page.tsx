import Link from "next/link"
import { redirect } from "next/navigation"
import { normalizeRole } from "@halaal-vest/auth"
import { buildDashboardSnapshot } from "@halaal-vest/domain"
import { formatCurrency } from "@halaal-vest/utils"
import { Button } from "@halaal-vest/ui/components/button"
import { DashboardShellClient } from "@/components/dashboard"
import { DashboardOverviewPage } from "@/components/dashboard/overview-page"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function TenantHomePage() {
  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.membership) {
    const role = normalizeRole(context.auth.membership.role)
    const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
    const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

    return (
      <DashboardShellClient
        role={role}
        tenantName={tenantName}
        userName={userName}
      >
        <DashboardOverviewPage />
      </DashboardShellClient>
    )
  }

  if (context.auth.sessionToken && context.auth.pendingMemberOnboarding) {
    redirect("/awaiting-approval")
  }

  if (!context.tenant) {
    redirect("/login")
  }

  const dashboard = buildDashboardSnapshot({
    tenant: context.tenant,
  })

  return (
    <main className="bg-public-canvas min-h-svh">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
            {context.tenant.slug}.halaal-vest.com
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {context.tenant.name}
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
          <a href="/signup/members">
            <Button size="lg" className="rounded-full px-5">
              Become a member
            </Button>
          </a>
          <a href="/login">
            <Button size="lg" variant="outline" className="rounded-full px-5">
              Login
            </Button>
          </a>
          <Link href="/">
            <Button size="lg" variant="outline" className="rounded-full px-5">
              Open app
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
