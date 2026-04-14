import { createDbRuntime, listTenantDomainsByTenantId } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { CustomDomainForm } from "@/features/forms/misc-forms"
import { WorkspacePageShell } from "@/features/workspace/page-shell"
import {
  runTenantDomainVerificationCheckAction,
  setTenantDomainPrimaryAction,
  updateTenantDomainVerificationStatusAction,
} from "@/lib/dashboard-actions"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function DomainsPage() {
  const { onboarding } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const domains =
    context.tenant && runtime.status === "database-configured"
      ? await listTenantDomainsByTenantId(context.tenant.id)
      : []
  const canManageDomains = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  return (
    <WorkspacePageShell
      eyebrow="Domains"
      title="Domain and routing"
      description="Review primary routing and register additional custom domains without introducing a heavier permission matrix."
    >
      {canManageDomains ? (
        <CustomDomainForm devMode={process.env.NODE_ENV !== "production"} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {onboarding?.primaryDashboardHostname ?? "Not configured yet"}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public site</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {onboarding?.primarySiteHostname ?? "Not configured yet"}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Platform-managed domains</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            `site` and `dashboard` hostnames are automatically routed by the platform. Keep one primary hostname per domain kind.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Custom-domain verification</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Custom domains should point DNS to the platform ingress before promotion. Verification stays lightweight for now, but routing scope, DNS target guidance, and primary-domain rules are already enforced from this admin surface.
          </p>
        </article>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Registered hostnames</h3>
        </div>
        <div className="divide-y divide-border/60">
          {domains.length > 0 ? (
            domains.map((domain) => (
              <article key={domain.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{domain.hostname}</p>
                    <p className="text-sm text-muted-foreground">
                      {domain.kind} · {domain.routingScope} routing · {domain.verificationStatus.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {domain.verificationNote}
                    </p>
                    {domain.verificationDetails ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lookup: {String(domain.verificationDetails.lookupMethod ?? "n/a")}
                        {Array.isArray(domain.verificationDetails.resolvedRecords) &&
                        domain.verificationDetails.resolvedRecords.length > 0
                          ? ` · records ${domain.verificationDetails.resolvedRecords.join(", ")}`
                          : ""}
                        {typeof domain.verificationDetails.errorCode === "string" &&
                        domain.verificationDetails.errorCode.length > 0
                          ? ` · ${domain.verificationDetails.errorCode}`
                          : ""}
                      </p>
                    ) : null}
                    {domain.verificationTarget ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {domain.verificationRecordType} target: {domain.verificationTarget}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{domain.isPrimary ? "Primary" : "Secondary"}</span>
                    {canManageDomains ? (
                      <div className="flex items-center gap-2">
                        <form action={runTenantDomainVerificationCheckAction}>
                          <input type="hidden" name="domainId" value={domain.id} />
                          <Button size="xs" type="submit" variant="outline">Run check</Button>
                        </form>
                        {domain.verificationStatus !== "verified" ? (
                          <form action={updateTenantDomainVerificationStatusAction}>
                            <input type="hidden" name="domainId" value={domain.id} />
                            <input type="hidden" name="status" value="verified" />
                            <Button size="xs" type="submit" variant="outline">Mark verified</Button>
                          </form>
                        ) : null}
                        {domain.verificationStatus !== "pending_dns" ? (
                          <form action={updateTenantDomainVerificationStatusAction}>
                            <input type="hidden" name="domainId" value={domain.id} />
                            <input type="hidden" name="status" value="pending_dns" />
                            <Button size="xs" type="submit" variant="outline">Mark pending DNS</Button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                    {canManageDomains && !domain.isPrimary ? (
                      <form action={setTenantDomainPrimaryAction}>
                        <input type="hidden" name="domainId" value={domain.id} />
                        <Button size="xs" type="submit" variant="outline">
                          Set {domain.routingScope} primary
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="px-4 py-4 text-sm text-muted-foreground">
              No persisted domains available in the current runtime yet.
            </article>
          )}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
