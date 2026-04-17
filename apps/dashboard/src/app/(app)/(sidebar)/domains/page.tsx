import { createDbRuntime, listTenantDomainsByTenantId } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspacePageShell } from "@/components/dashboard"
import { CustomDomainForm } from "@/components/forms/misc-forms"
import { runTenantDomainVerificationCheckAction, setTenantDomainPrimaryAction, updateTenantDomainVerificationStatusAction } from "@/lib/dashboard-actions"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function DomainsPage() {
  const { onboarding } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const domains = context.tenant && runtime.status === "database-configured" ? await listTenantDomainsByTenantId(context.tenant.id) : []
  const canManageDomains = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  return (
    <WorkspacePageShell eyebrow="Domains" title="Domain and routing" description="Review the canonical tenant host, legacy dashboard aliases, and custom-domain verification from one routing control surface.">
      {canManageDomains ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Register" title="Add a custom domain" description="Register an additional tenant hostname or legacy app alias and manage verification from this workspace." />
          <div className="mt-5"><CustomDomainForm devMode={process.env.NODE_ENV !== "production"} /></div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard label="Registered hostnames" value={domains.length.toString()} detail="Platform and custom hostnames available for this tenant." />
        <DashboardStatCard label="Verified" value={domains.filter((domain) => domain.verificationStatus === "verified").length.toString()} detail="Hostnames currently marked verified." tone="positive" />
        <DashboardStatCard label="Canonical tenant host" value={onboarding?.primarySiteHostname ?? "Not set"} detail="Primary hostname serving the public site, login, and authenticated workspace." />
        <DashboardStatCard label="Legacy app alias" value={onboarding?.primaryDashboardHostname ?? "Not set"} detail="Optional legacy dashboard hostname kept for redirects and transition support." />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Platform" title="Platform-managed domains" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">The tenant host is now the canonical surface for the public site, login, and authenticated workspace. Legacy `dashboard.` hostnames can stay registered as redirect aliases during migration.</p>
        </DashboardSectionCard>
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Verification" title="Custom-domain verification" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Custom domains should point DNS to the platform ingress before promotion. Verification stays lightweight for now, but routing scope, DNS target guidance, and primary-domain rules are already enforced here.</p>
        </DashboardSectionCard>
      </section>

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
                  {canManageDomains ? (
                    <>
                      <form action={runTenantDomainVerificationCheckAction}><input type="hidden" name="domainId" value={domain.id} /><Button size="xs" type="submit" variant="outline" className="rounded-full">Run check</Button></form>
                      {domain.verificationStatus !== "verified" ? <form action={updateTenantDomainVerificationStatusAction}><input type="hidden" name="domainId" value={domain.id} /><input type="hidden" name="status" value="verified" /><Button size="xs" type="submit" variant="outline" className="rounded-full">Mark verified</Button></form> : null}
                      {domain.verificationStatus !== "pending_dns" ? <form action={updateTenantDomainVerificationStatusAction}><input type="hidden" name="domainId" value={domain.id} /><input type="hidden" name="status" value="pending_dns" /><Button size="xs" type="submit" variant="outline" className="rounded-full">Mark pending DNS</Button></form> : null}
                      {!domain.isPrimary ? <form action={setTenantDomainPrimaryAction}><input type="hidden" name="domainId" value={domain.id} /><Button size="xs" type="submit" variant="outline" className="rounded-full">Set {domain.routingScope} primary</Button></form> : null}
                    </>
                  ) : null}
                </div>
              </div>
            </DashboardSurfaceCard>
          )) : <p className="text-sm text-muted-foreground">No persisted domains available in the current runtime yet.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
