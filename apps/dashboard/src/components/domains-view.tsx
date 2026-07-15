import type { TenantDomainRecord } from "@halaalvest/db"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"

function verificationTone(status: string) {
  return status === "verified" ? "positive" : "warning"
}

export function DomainsView({
  canonicalHostname,
  domains,
}: {
  canonicalHostname?: string | null
  domains: TenantDomainRecord[]
}) {
  const verifiedCount = domains.filter(
    (domain) => domain.verificationStatus === "verified"
  ).length

  return (
    <WorkspacePageShell
      description="Review the canonical cooperative host used for the public site and authenticated workspace."
      eyebrow="Domains"
      title="Domain and routing"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          detail="Platform hostnames available for this cooperative."
          label="Registered hostnames"
          value={domains.length.toString()}
        />
        <DashboardStatCard
          detail="Hostnames currently marked verified."
          label="Verified"
          tone="positive"
          value={verifiedCount.toString()}
        />
        <DashboardStatCard
          detail="Primary hostname serving the public site, login, and authenticated workspace."
          label="Canonical cooperative host"
          value={canonicalHostname ?? "Not set"}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Platform"
          title="Single cooperative domain"
        />
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          The cooperative host is the only canonical domain for the public site,
          login, and authenticated workspace.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{domains.length} domains</TrendPill>}
          eyebrow="Hostnames"
          title="Registered hostnames"
        />
        <div className="mt-5 space-y-3">
          {domains.length > 0 ? (
            domains.map((domain) => (
              <DashboardSurfaceCard key={domain.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {domain.hostname}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {domain.kind} · {domain.routingScope} routing ·{" "}
                      {domain.verificationStatus.replace(/_/g, " ")}
                    </p>
                    {domain.verificationNote ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {domain.verificationNote}
                      </p>
                    ) : null}
                    {domain.verificationTarget ? (
                      <p className="mt-1 text-xs font-medium text-muted-foreground uppercase">
                        {domain.verificationRecordType} target:{" "}
                        {domain.verificationTarget}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TrendPill tone={verificationTone(domain.verificationStatus)}>
                      {domain.isPrimary ? "Primary" : "Secondary"}
                    </TrendPill>
                  </div>
                </div>
              </DashboardSurfaceCard>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No persisted domains available in the current runtime yet.
            </p>
          )}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
