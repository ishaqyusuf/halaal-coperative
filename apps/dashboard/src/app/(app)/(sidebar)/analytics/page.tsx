import { createDbRuntime, listLoans } from "@halaal-vest/db"
import { formatCurrency, formatPercent } from "@halaal-vest/utils"
import {
  DashboardActionLink,
  DashboardPageHeader,
  DashboardPageStack,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"

export default async function AnalyticsPage() {
  const { dashboard, onboarding } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const loans =
    context.tenant && runtime.status === "database-configured"
      ? await listLoans(context.tenant.id)
      : []
  const outstandingLoanValue = loans.reduce(
    (total, loan) => total + Number(loan.outstandingPrincipal),
    0,
  )
  const repaymentCoverage =
    dashboard.availablePool > 0
      ? outstandingLoanValue / Math.max(dashboard.availablePool, 1)
      : 0

  return (
    <DashboardPageStack>
      <DashboardPageHeader
        badge="Analytics"
        eyebrow="Operations intelligence"
        title={`${context.tenant?.name ?? "Workspace"} analytics`}
        description="A dedicated analytics surface for contribution coverage, loan exposure, member growth, and operational readiness across the cooperative workspace."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Collection coverage"
          value={formatPercent(dashboard.collectionCoverage)}
          detail="How much of the current target is covered by the available pool."
          tone={dashboard.collectionCoverage >= 0.75 ? "positive" : "warning"}
        />
        <DashboardStatCard
          label="Outstanding loans"
          value={formatCurrency(outstandingLoanValue)}
          detail="Current open principal across approved, disbursed, and active loans."
          tone={outstandingLoanValue > dashboard.availablePool ? "warning" : "default"}
        />
        <DashboardStatCard
          label="Delinquency rate"
          value={formatPercent(dashboard.delinquencyRate)}
          detail="Share of active facilities with overdue repayment items."
          tone={dashboard.delinquencyRate > 0.08 ? "warning" : "positive"}
        />
        <DashboardStatCard
          label="Onboarding completion"
          value={formatPercent(onboarding?.completionRatio ?? 0)}
          detail="Tenant readiness progress for the current workspace."
          tone={onboarding?.completionRatio === 1 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Finance posture"
            title="Liquidity and member finance trendlines"
            description="Use this summary to compare available liquidity with current exposure and contribution performance."
            actions={
              <>
                <TrendPill tone={repaymentCoverage > 1 ? "warning" : "positive"}>
                  {formatPercent(repaymentCoverage)} exposure to pool
                </TrendPill>
                <DashboardActionLink href="/reports" size="sm">
                  Open reports
                </DashboardActionLink>
              </>
            }
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DashboardSurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Available pool
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatCurrency(dashboard.availablePool)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Current liquidity available for approvals and disbursement.
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Monthly target
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatCurrency(dashboard.monthlyContributionTarget)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Expected inflow for the active contribution cycle.
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Reserve buffer
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatCurrency(dashboard.reserveBuffer)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Protected threshold before additional approvals should slow.
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Active members
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {dashboard.memberCount}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Members currently contributing to the workspace economy.
              </p>
            </DashboardSurfaceCard>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Signals"
            title="Operator takeaways"
            description="Three fast reads to guide daily decisions."
          />

          <div className="mt-5 space-y-3">
            <DashboardSurfaceCard>
              <p className="font-medium text-foreground">Loan pressure</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {outstandingLoanValue > dashboard.availablePool
                  ? "Outstanding principal is above the current available pool, so approvals should stay conservative."
                  : "Current outstanding principal remains within the current pool coverage range."}
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="font-medium text-foreground">Collection posture</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {dashboard.collectionCoverage >= 0.75
                  ? "Contribution coverage is healthy enough to support normal finance operations."
                  : "Contribution coverage is below the preferred threshold and may need follow-up action."}
              </p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="font-medium text-foreground">Workspace readiness</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {onboarding?.completionRatio === 1
                  ? "Core onboarding tasks are complete."
                  : "Tenant onboarding is still in progress, so some operational workflows may remain partially configured."}
              </p>
            </DashboardSurfaceCard>
          </div>
        </DashboardSectionCard>
      </section>
    </DashboardPageStack>
  )
}
