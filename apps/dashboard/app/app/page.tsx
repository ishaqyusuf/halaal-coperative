import { formatCurrency, formatPercent } from "@halaal-vest/utils"
import { Badge } from "@halaal-vest/ui/components/badge"
import { Button } from "@halaal-vest/ui/components/button"
import {
  DashboardPageHeader,
  DashboardPageStack,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
} from "@/components/dashboard/primitives"
import { getDashboardPageData } from "@/lib/server-context"

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  )
}

export default async function Page() {
  const {
    dashboard,
    hasSession,
    membership,
    onboarding,
    productAreas,
    runtime,
    tenant,
    tenantResolution,
    workspaceModules,
  } = await getDashboardPageData()

  const collectionGap = Math.max(0, dashboard.monthlyContributionTarget - dashboard.availablePool)
  const onboardingTone = onboarding?.completionRatio === 1 ? "positive" : "warning"

  return (
    <DashboardPageStack>
      <DashboardPageHeader
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              Export snapshot
            </Button>
            <Button className="rounded-full">Open operations</Button>
          </>
        }
        badge={runtime.status === "database-configured" ? "Live runtime" : "Seed runtime"}
        description="A Midday-style operations overview for cooperative cash position, workflow readiness, onboarding progress, and the latest member finance activity."
        eyebrow="Overview"
        title={`${tenant.name} workspace`}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Available pool"
          value={formatCurrency(dashboard.availablePool)}
          detail="Funds currently available for approved disbursement."
          tone="default"
        />
        <DashboardStatCard
          label="Contribution target"
          value={formatCurrency(dashboard.monthlyContributionTarget)}
          detail="Expected member inflow for the active collection cycle."
          tone="default"
        />
        <DashboardStatCard
          label="Active loans"
          value={dashboard.activeLoans.toString()}
          detail={`${formatPercent(dashboard.delinquencyRate)} delinquency rate across active facilities.`}
          tone={dashboard.delinquencyRate > 0.08 ? "warning" : "positive"}
        />
        <DashboardStatCard
          label="Reserve buffer"
          value={formatCurrency(dashboard.reserveBuffer)}
          detail="Policy-backed reserve threshold before additional approvals."
          tone="default"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Control center"
            title="Finance posture and decision context"
            description="Match the speed of the daily work queue with the safeguards the finance team needs before approving or reversing money movements."
            actions={<TrendPill tone={collectionGap > 0 ? "warning" : "positive"}>{collectionGap > 0 ? `${formatCurrency(collectionGap)} collection gap` : "Target covered"}</TrendPill>}
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[22px] border border-border/70 bg-muted/25 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Current runway
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    {formatCurrency(dashboard.availablePool)}
                  </h3>
                </div>
                <TrendPill tone={dashboard.collectionCoverage >= 0.75 ? "positive" : "warning"}>
                  {formatPercent(dashboard.collectionCoverage)} coverage
                </TrendPill>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Coverage against target</span>
                    <span>{formatPercent(dashboard.collectionCoverage)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border/70">
                    <div
                      className="h-2 rounded-full bg-foreground"
                      style={{ width: `${Math.min(100, Math.round(dashboard.collectionCoverage * 100))}%` }}
                    />
                  </div>
                </div>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Members</dt>
                    <dd className="mt-2 text-lg font-semibold text-foreground">{dashboard.memberCount}</dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session</dt>
                    <dd className="mt-2 text-lg font-semibold text-foreground">{hasSession ? "Active" : "Anonymous"}</dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Routing</dt>
                    <dd className="mt-2 text-lg font-semibold capitalize text-foreground">{tenantResolution.resolvedBy}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Immediate focus
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <p className="text-sm font-medium text-foreground">Approvals and disbursement readiness</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Strengthen the approval lane before automated disbursement is enabled across tenants.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <p className="text-sm font-medium text-foreground">Workspace setup progress</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {onboarding
                      ? `${onboarding.completedStepCount} of ${onboarding.totalStepCount} onboarding steps are complete.`
                      : "No tenant onboarding state is available for the current host."}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <p className="text-sm font-medium text-foreground">Role in session</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {membership ? membership.role : "No active membership loaded for this session."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Bootstrap"
            title="Tenant readiness"
            description="Operational basics, routing state, and configuration progress needed before the tenant workspace feels fully production-ready."
            actions={<TrendPill tone={onboardingTone}>{onboarding ? `${formatPercent(onboarding.completionRatio)} configured` : "Not started"}</TrendPill>}
          />

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tenant host</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {onboarding?.primaryDashboardHostname ?? "Not configured yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Legacy dashboard alias</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {onboarding?.primarySiteHostname ?? "Not configured yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <TrendPill tone={onboardingTone}>{onboarding?.status ?? tenant.status}</TrendPill>
                <span className="text-sm text-muted-foreground">{tenant.currencyCode} · {tenant.timezone}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product areas scaffolded</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {productAreas.map((area) => (
                  <Badge key={area.title} variant="outline" className="rounded-full px-2.5 py-1">
                    {area.title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DashboardSectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Members"
            title="Recent member records"
            actions={<TrendPill>{workspaceModules.members.length} loaded</TrendPill>}
          />

          <div className="mt-5 space-y-3">
            {workspaceModules.members.length > 0 ? (
              workspaceModules.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.fullName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {member.memberNumber} · {member.memberType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <TrendPill>{member.status}</TrendPill>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                Connect a configured database runtime to surface the first member queue here.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Contributions"
            title="Latest posted activity"
            actions={<TrendPill>{workspaceModules.contributions.length} loaded</TrendPill>}
          />

          <div className="mt-5 space-y-3">
            {workspaceModules.contributions.length > 0 ? (
              workspaceModules.contributions.map((contribution) => (
                <div key={contribution.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{contribution.memberName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {contribution.channel} · {contribution.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(contribution.amount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatShortDate(contribution.postedAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                Recent contribution postings will appear here once live tenant finance data is available.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Charges"
            title="Active charge setup"
            actions={<TrendPill>{workspaceModules.chargeDefinitions.length} active rules</TrendPill>}
          />

          <div className="mt-5 space-y-3">
            {workspaceModules.chargeDefinitions.length > 0 ? (
              workspaceModules.chargeDefinitions.map((charge) => (
                <div key={charge.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{charge.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {charge.code} · {charge.kind.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <TrendPill tone={charge.isActive ? "positive" : "warning"}>
                        {charge.isActive ? "Active" : "Inactive"}
                      </TrendPill>
                      <p className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(charge.amount)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                Charge definitions will surface here after the tenant finance setup is configured.
              </p>
            )}
          </div>
        </DashboardSectionCard>
      </section>
    </DashboardPageStack>
  )
}
