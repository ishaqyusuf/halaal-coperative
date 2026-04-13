import { formatCurrency, formatPercent } from "@halaal-vest/utils"
import { Button } from "@halaal-vest/ui/components/button"
import { getDashboardPageData } from "@/lib/server-context"

export default async function Page() {
  const {
    dashboard,
    hasSession,
    membership,
    onboarding,
    productAreas,
    runtime,
    tenantResolution,
    workspaceModules,
  } =
    await getDashboardPageData()

  const summaryCards = [
    {
      label: "Available pool",
      value: formatCurrency(dashboard.availablePool),
      note: "Funds available for approved disbursement after current commitments.",
    },
    {
      label: "Monthly contributions due",
      value: formatCurrency(dashboard.monthlyContributionTarget),
      note: "Expected inflow from payroll and self-funded contributors this cycle.",
    },
    {
      label: "Active loans",
      value: dashboard.activeLoans.toString(),
      note: "Loans currently being serviced across quick-loan and normal-loan products.",
    },
    {
      label: "Delinquency rate",
      value: formatPercent(dashboard.delinquencyRate),
      note: "Share of active loans with overdue installments requiring follow-up.",
    },
  ]

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(218,119,38,0.14),_transparent_36%),linear-gradient(180deg,_rgba(255,248,239,0.95)_0%,_rgba(255,255,255,1)_44%,_rgba(248,244,237,1)_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-12">
        <header className="rounded-4xl border border-border/70 bg-background/88 p-6 shadow-[0_24px_80px_rgba(88,52,24,0.08)] backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.24em]">
                Cooperative Dashboard
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Tenant operations for contributions, approvals, and financial oversight.
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7 sm:text-base">
                This workspace is the tenant dashboard surface in a `plot-keys`-style
                monorepo, paired with a SaaS marketing site, tenant public websites, and
                a shared API layer. Amanah is one case-study tenant, not the platform boundary.
              </p>
              <p className="text-muted-foreground mt-3 text-xs uppercase tracking-[0.18em]">
                Resolution: {tenantResolution.resolvedBy} · Session: {hasSession ? "present" : "anonymous"}
                {membership ? ` · Role: ${membership.role}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Open Workspace</Button>
              <Button variant="outline">Review API Contracts</Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-border/60 bg-background/92 p-5 shadow-sm"
            >
              <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
              <p className="text-muted-foreground mt-3 text-sm leading-6">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-4xl border border-border/60 bg-background/92 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                  Core product areas
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Scaffolded around cooperative workflows that multiple tenants can reuse.
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Press <kbd>d</kbd> to toggle dark mode.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {productAreas.map((area) => (
                <div
                  key={area.title}
                  className="rounded-3xl border border-border/60 bg-muted/35 p-4"
                >
                  <p className="text-sm font-medium">{area.title}</p>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {area.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-4xl border border-border/60 bg-[linear-gradient(180deg,_rgba(195,102,28,0.08)_0%,_rgba(255,255,255,0.95)_100%)] p-6 shadow-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
              Tenant snapshot
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {dashboard.tenantName}
            </h2>

            <dl className="mt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground text-sm">Members</dt>
                <dd className="text-sm font-medium">{dashboard.memberCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground text-sm">Contribution coverage</dt>
                <dd className="text-sm font-medium">
                  {formatPercent(dashboard.collectionCoverage)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground text-sm">Reserve policy</dt>
                <dd className="text-sm font-medium">
                  {formatCurrency(dashboard.reserveBuffer)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground text-sm">Immediate focus</dt>
                <dd className="max-w-[14rem] text-right text-sm font-medium text-balance">
                  Strengthen approvals before enabling automated disbursement.
                </dd>
              </div>
            </dl>
          </article>
        </section>

        {onboarding ? (
          <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <article className="rounded-4xl border border-border/60 bg-background/92 p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                    Workspace bootstrap
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {onboarding.completedStepCount} of {onboarding.totalStepCount} onboarding steps complete.
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  {formatPercent(onboarding.completionRatio)} configured
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {onboarding.steps.map((step) => (
                  <div
                    key={step.key}
                    className="rounded-3xl border border-border/60 bg-muted/35 p-4"
                  >
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {step.description}
                    </p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]">
                      {step.complete ? "Complete" : "Pending"}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-4xl border border-border/60 bg-[linear-gradient(180deg,_rgba(195,102,28,0.08)_0%,_rgba(255,255,255,0.95)_100%)] p-6 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                Routing defaults
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Tenant hostnames are ready for app and public traffic.
              </h2>

              <dl className="mt-6 flex flex-col gap-4">
                <div className="border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground text-sm">Public site</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {onboarding.primarySiteHostname ?? "Not configured yet"}
                  </dd>
                </div>
                <div className="border-b border-border/60 pb-3">
                  <dt className="text-muted-foreground text-sm">Dashboard</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {onboarding.primaryDashboardHostname ?? "Not configured yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Current status</dt>
                  <dd className="mt-1 text-sm font-medium capitalize">{onboarding.status}</dd>
                </div>
              </dl>
            </article>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_0.9fr]">
          <article className="rounded-4xl border border-border/60 bg-background/92 p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                  Members
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Recent member records
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {runtime.status === "database-configured"
                  ? `${workspaceModules.members.length} loaded`
                  : "DB required"}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {workspaceModules.members.length > 0 ? (
                workspaceModules.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-border/60 bg-muted/35 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{member.fullName}</p>
                      <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.18em]">
                        {member.memberNumber} · {member.memberType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em]">
                      {member.status}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  Connect a database and seed real tenants to view workspace member records here.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-4xl border border-border/60 bg-background/92 p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                  Contributions
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Latest posted activity
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {runtime.status === "database-configured"
                  ? `${workspaceModules.contributions.length} loaded`
                  : "DB required"}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {workspaceModules.contributions.length > 0 ? (
                workspaceModules.contributions.map((contribution) => (
                  <div
                    key={contribution.id}
                    className="rounded-3xl border border-border/60 bg-muted/35 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">{contribution.memberName}</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(contribution.amount)}
                      </p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.18em]">
                      {contribution.channel} · {contribution.status} ·{" "}
                      {new Date(contribution.postedAt).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  Recent contribution postings will appear here once tenant financial data is present.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-4xl border border-border/60 bg-background/92 p-6 shadow-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                Charges
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Active charge setup
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              {workspaceModules.chargeDefinitions.length > 0 ? (
                workspaceModules.chargeDefinitions.map((charge) => (
                  <div
                    key={charge.id}
                    className="rounded-3xl border border-border/60 bg-muted/35 px-4 py-3"
                  >
                    <p className="text-sm font-medium">{charge.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.18em]">
                      {charge.code} · {charge.kind} · {charge.isActive ? "active" : "inactive"}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatCurrency(charge.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  Charge definitions will surface here after the tenant finance setup is configured.
                </p>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
