import { createDbRuntime, listTenantDomainsByTenantId } from "@halaalvest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspacePageShell } from "@/components/dashboard"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"

export default async function DomainsPage() {
  const { onboarding } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const domains = context.tenant && runtime.status === "database-configured" ? await listTenantDomainsByTenantId(context.tenant.id) : []

  return (
    <WorkspacePageShell eyebrow="Domains" title="Domain and routing" description="Review the canonical tenant host used for the public site and authenticated workspace.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Registered hostnames" value={domains.length.toString()} detail="Platform hostnames available for this tenant." />
        <DashboardStatCard label="Verified" value={domains.filter((domain) => domain.verificationStatus === "verified").length.toString()} detail="Hostnames currently marked verified." tone="positive" />
        <DashboardStatCard label="Canonical tenant host" value={onboarding?.primarySiteHostname ?? "Not set"} detail="Primary hostname serving the public site, login, and authenticated workspace." />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Platform" title="Single tenant domain" />
        <p className="mt-5 text-sm leading-6 text-muted-foreground">The tenant host is the only canonical domain. The public site lives at the host root, and the authenticated workspace lives under /app on the same host.</p>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Hostnames" title="Registered hostnames" actions={<TrendPill>{domains.length} domains</TrendPill>} />
        <div className="mt-5 space-y-3">
          {domains.length > 0 ? domains.map((domain) => (
            <DashboardSurfaceCard key={domain.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{domain.hostname}</p>
                  <p className="text-sm text-muted-foreground">{domain.kind} · {domain.routingScope} routing · {domain.verificationStatus.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{domain.verificationNote}</p>
                  {domain.verificationTarget ? <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{domain.verificationRecordType} target: {domain.verificationTarget}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TrendPill tone={domain.verificationStatus === "verified" ? "positive" : "warning"}>{domain.isPrimary ? "Primary" : "Secondary"}</TrendPill>
                </div>
              </div>
            </DashboardSurfaceCard>
          )) : <p className="text-sm text-muted-foreground">No persisted domains available in the current runtime yet.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
