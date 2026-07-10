import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import {
  LoanRequestForm,
} from "@/components/forms/finance-forms"
import { WorkspacePageShell } from "@/components/dashboard"
import { LoanPortfolioTable } from "@/components/tables/loans/portfolio-table"
import { LoanRequestsTable } from "@/components/tables/loans/requests-table"
import { loadLoansPageData } from "@/lib/loans"

type LoansPageData = Extract<
  Awaited<ReturnType<typeof loadLoansPageData>>,
  { state: "ready" }
>

export function LoansPageView({
  canReview,
  canSubmit,
  dashboard,
  financingCycle,
  loanProducts,
  loanRequests,
  loans,
  members,
  quickFillEnabled,
}: LoansPageData) {
  const intakeDisabledReason =
    financingCycle.intakeStatus === "open"
      ? null
      : financingCycle.intakeStatus === "missing"
        ? "Open the current monthly financing cycle before accepting loan requests."
        : `The current monthly financing cycle is ${financingCycle.intakeStatus}; intake is closed.`
  const productUsageByType = {
    normal: financingCycle.normal,
    quick: financingCycle.quick,
  }

  return (
    <WorkspacePageShell
      eyebrow="Loans"
      title="Loan operations"
      description="Review requests, approval history, liquidity posture, and approved loans from a denser credit-control workspace."
    >
      {canSubmit ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Capture product, term months, expected monthly servicing, and extra savings commitment in one request."
            eyebrow="Requests"
            title="Submit a new loan request"
          />
          <div className="mt-5">
            <LoanRequestForm
              devMode={quickFillEnabled}
              disabledReason={intakeDisabledReason}
              loanProducts={loanProducts.map((product) => {
                const codePrefix = product.code ? `${product.code} - ` : ""
                const remainingAmount = formatCurrency(
                  productUsageByType[product.loanType].remainingAmount
                )

                return {
                  id: product.id,
                  label: `${codePrefix}${product.name} (up to ${product.termMonths} months, ${remainingAmount} remaining)`,
                }
              })}
              members={members.items.map((member) => ({
                id: member.id,
                label: `${member.fullName} (${member.memberNumber})`,
              }))}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <TrendPill
              tone={
                financingCycle.intakeStatus === "open"
                  ? "positive"
                  : "warning"
              }
            >
              {financingCycle.intakeStatus === "open"
                ? "intake open"
                : "intake closed"}
            </TrendPill>
          }
          description="Monthly cycle capacity reserves submitted, under-review, and approved requests against quick and normal budgets."
          eyebrow="Cycle capacity"
          title="Current monthly financing capacity"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            detail={`${formatCurrency(financingCycle.quick.requestedReservedAmount)} requested or held`}
            label="Quick remaining"
            tone={
              financingCycle.quick.remainingAmount <= 0
                ? "warning"
                : "positive"
            }
            value={formatCurrency(financingCycle.quick.remainingAmount)}
          />
          <DashboardStatCard
            detail={`${formatCurrency(financingCycle.normal.requestedReservedAmount)} requested or held`}
            label="Normal remaining"
            tone={
              financingCycle.normal.remainingAmount <= 0
                ? "warning"
                : "positive"
            }
            value={formatCurrency(financingCycle.normal.remainingAmount)}
          />
          <DashboardStatCard
            detail={`${formatCurrency(financingCycle.deployableFunds.approvedHoldAmount)} approved holds excluded`}
            label="Deployable funds"
            tone={
              financingCycle.deployableFunds.deployableFunds > 0
                ? "positive"
                : "warning"
            }
            value={formatCurrency(financingCycle.deployableFunds.deployableFunds)}
          />
          <DashboardStatCard
            detail={`${Math.round(financingCycle.collectionCoverage * 100)}% of projected commitments collected`}
            label="Collections"
            tone={
              financingCycle.receivedContributionAmount >=
              financingCycle.projectedCommitmentAmount
                ? "positive"
                : "warning"
            }
            value={formatCurrency(financingCycle.receivedContributionAmount)}
          />
        </div>
        {financingCycle.warnings.length ? (
          <DashboardSurfaceCard className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
            <p className="text-sm font-medium">Financing cycle warnings</p>
            <ul className="mt-2 space-y-1 text-sm">
              {financingCycle.warnings.map((warning) => (
                <li key={warning.key}>{warning.label}</li>
              ))}
            </ul>
          </DashboardSurfaceCard>
        ) : null}
      </DashboardSectionCard>

      <section className="grid gap-4 sm:grid-cols-3">
        <DashboardStatCard
          detail="Currently approved, disbursed, or active loan records."
          label="Active loans"
          value={dashboard.activeLoans.toString()}
        />
        <DashboardStatCard
          detail="Current liquidity available for approved disbursement."
          label="Deployable funds"
          value={formatCurrency(financingCycle.deployableFunds.deployableFunds)}
        />
        <DashboardStatCard
          detail="Share of active facilities with overdue repayment items."
          label="Delinquency"
          tone={dashboard.delinquencyRate > 0.08 ? "warning" : "default"}
          value={`${Math.round(dashboard.delinquencyRate * 100)}%`}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{loanRequests.length} requests</TrendPill>}
          description="Review request context, approval history, and monthly servicing before the request becomes a live loan."
          eyebrow="Reviews"
          title="Loan requests queue"
        />
        <div className="mt-5">
          <LoanRequestsTable canReview={canReview} items={loanRequests} />
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{loans.length} loans</TrendPill>}
          description="Review live principal, outstanding balance, and liquidity warnings before disbursement."
          eyebrow="Portfolio"
          title="Approved and active loans"
        />
        <div className="mt-5">
          <LoanPortfolioTable
            availablePool={financingCycle.deployableFunds.deployableFunds}
            canReview={canReview}
            items={loans}
          />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
