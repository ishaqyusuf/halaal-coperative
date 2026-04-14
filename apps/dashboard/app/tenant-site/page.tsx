import { createDbRuntime, listTenantDomainsByTenantId } from "@halaal-vest/db"
import { WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData } from "@/lib/server-context"

export default async function TenantSitePage() {
  const { onboarding, tenant } = await getDashboardPageData()
  const runtime = createDbRuntime()
  const domains =
    runtime.status === "database-configured"
      ? await listTenantDomainsByTenantId(tenant.id)
      : []
  const siteDomain =
    domains.find((domain) => domain.kind === "site" && domain.isPrimary)?.hostname ??
    onboarding?.primarySiteHostname ??
    "Not configured yet"
  const dashboardDomain =
    domains.find((domain) => domain.kind === "dashboard" && domain.isPrimary)?.hostname ??
    onboarding?.primaryDashboardHostname ??
    "Not configured yet"

  const readinessChecks = [
    { label: "Cooperative profile", ready: Boolean(tenant.name && tenant.timezone) },
    { label: "Public site hostname", ready: siteDomain !== "Not configured yet" },
    { label: "Dashboard hostname", ready: dashboardDomain !== "Not configured yet" },
    { label: "Office address", ready: Boolean(tenant.officeAddress) },
  ]

  return (
    <WorkspacePageShell
      eyebrow="Tenant Site"
      title="Public cooperative site"
      description="Coordinate the cooperative’s public website, domain readiness, and publishing inputs from one route."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessChecks.map((item) => (
          <article key={item.label} className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-base font-semibold tracking-tight text-foreground">
              {item.ready ? "Ready" : "Needs attention"}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tenant</p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{tenant.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the profile and domain routes to finish the inputs needed for a clean public cooperative presence.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary site hostname</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{siteDomain}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard hostname</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{dashboardDomain}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile summary</p>
          <p className="mt-3 text-sm leading-7 text-foreground">
            {tenant.officeAddress ?? "Office address not captured yet"}
          </p>
        </article>
      </div>
    </WorkspacePageShell>
  )
}
