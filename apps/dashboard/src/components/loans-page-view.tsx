import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
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
  loanProducts,
  loanRequests,
  loans,
  members,
  quickFillEnabled,
}: LoansPageData) {
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
              loanProducts={loanProducts.map((product) => ({
                id: product.id,
                label: `${product.name} (up to ${product.termMonths} months)`,
              }))}
              members={members.items.map((member) => ({
                id: member.id,
                label: `${member.fullName} (${member.memberNumber})`,
              }))}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <DashboardStatCard
          detail="Currently approved, disbursed, or active loan records."
          label="Active loans"
          value={dashboard.activeLoans.toString()}
        />
        <DashboardStatCard
          detail="Current liquidity available for approved disbursement."
          label="Available pool"
          value={formatCurrency(dashboard.availablePool)}
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
            availablePool={dashboard.availablePool}
            canReview={canReview}
            items={loans}
          />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
