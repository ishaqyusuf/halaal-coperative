import { createDbRuntime, listTenantDomainsByTenantId } from "@halaal-vest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData } from "@/lib/server-context"

export default async function TenantSitePage() {
  const { onboarding, tenant } = await getDashboardPageData()
  const runtime = createDbRuntime()
  const domains = runtime.status === "database-configured" ? await listTenantDomainsByTenantId(tenant.id) : []
  const siteDomain = domains.find((domain) => domain.kind === "site" && domain.isPrimary)?.hostname ?? onboarding?.primarySiteHostname ?? "Not configured yet"
  const dashboardDomain = domains.find((domain) => domain.kind === "dashboard" && domain.isPrimary)?.hostname ?? onboarding?.primaryDashboardHostname ?? "Not configured yet"
  const readinessChecks = [
    { label: "Cooperative profile", ready: Boolean(tenant.name && tenant.timezone) },
    { label: "Public site hostname", ready: siteDomain !== "Not configured yet" },
    { label: "Dashboard hostname", ready: dashboardDomain !== "Not configured yet" },
    { label: "Office address", ready: Boolean(tenant.officeAddress) },
  ]

  return (
    <WorkspacePageShell eyebrow="Tenant Site" title="Public cooperative site" description="Coordinate the cooperative’s public website, domain readiness, and publishing inputs from one route.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessChecks.map((item) => (
          <DashboardStatCard key={item.label} label={item.label} value={item.ready ? "Ready" : "Needs attention"} detail="Publishing readiness signal for the current tenant setup." tone={item.ready ? "positive" : "warning"} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Tenant" title={tenant.name} />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Use the profile and domain routes to finish the inputs needed for a clean public cooperative presence.</p>
        </DashboardSectionCard>
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Primary site hostname" title={siteDomain} />
          <div className="mt-5"><TrendPill tone={siteDomain === "Not configured yet" ? "warning" : "positive"}>{siteDomain === "Not configured yet" ? "Needs setup" : "Ready"}</TrendPill></div>
        </DashboardSectionCard>
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Dashboard hostname" title={dashboardDomain} />
          <div className="mt-5"><TrendPill tone={dashboardDomain === "Not configured yet" ? "warning" : "positive"}>{dashboardDomain === "Not configured yet" ? "Needs setup" : "Ready"}</TrendPill></div>
        </DashboardSectionCard>
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Profile summary" title="Workspace publishing inputs" />
          <p className="mt-5 text-sm leading-7 text-foreground">{tenant.officeAddress ?? "Office address not captured yet"}</p>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
