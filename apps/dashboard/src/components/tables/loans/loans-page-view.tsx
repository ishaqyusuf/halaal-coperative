import { formatCurrency } from "@halaal-vest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import {
  LoanDisbursementForm,
  LoanRequestForm,
  LoanReviewForm,
} from "@/components/forms/finance-forms"
import { WorkspacePageShell } from "@/components/dashboard"
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
              devMode={process.env.NODE_ENV !== "production"}
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
        <div className="mt-5 space-y-3">
          {loanRequests.map((request) => (
            <DashboardSurfaceCard key={request.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{request.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.loanProduct.name} ·{" "}
                    {formatCurrency(Number(request.requestedAmount))} requested
                  </p>
                </div>
                <TrendPill tone={request.status === "approved" ? "positive" : "warning"}>
                  {request.status.replace(/_/g, " ")}
                </TrendPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {request.requestedTermMonths} months · estimated servicing{" "}
                {formatCurrency(Number(request.estimatedMonthlyServicing))} · extra savings{" "}
                {formatCurrency(Number(request.extraMonthlySavingsAmount))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Eligible snapshot {formatCurrency(Number(request.eligibleAmountSnapshot))}
                {request.reviewNotes ? ` · ${request.reviewNotes}` : ""}
              </p>
              {request.approvals.length ? (
                <DashboardSurfaceCard className="mt-3 bg-card p-3 text-xs text-muted-foreground">
                  {request.approvals.map((approval) => (
                    <p key={approval.id}>
                      {approval.action} · {approval.actorUser.fullName} ·{" "}
                      {approval.actedAt.toISOString().slice(0, 10)}
                      {approval.notes ? ` · ${approval.notes}` : ""}
                    </p>
                  ))}
                </DashboardSurfaceCard>
              ) : null}
              {request.purpose ? (
                <p className="mt-3 text-sm text-muted-foreground">{request.purpose}</p>
              ) : null}
              {canReview ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.status !== "approved" ? (
                    <LoanReviewForm
                      defaultValues={{ loanRequestId: request.id, notes: "", status: "approved" }}
                      label="Approve"
                    />
                  ) : null}
                  {request.status !== "rejected" ? (
                    <LoanReviewForm
                      defaultValues={{ loanRequestId: request.id, notes: "", status: "rejected" }}
                      label="Reject"
                      variant="outline"
                    />
                  ) : null}
                  {request.status === "submitted" ? (
                    <LoanReviewForm
                      defaultValues={{
                        loanRequestId: request.id,
                        notes: "",
                        status: "under_review",
                      }}
                      label="Mark under review"
                      variant="outline"
                    />
                  ) : null}
                </div>
              ) : null}
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{loans.length} loans</TrendPill>}
          description="Review live principal, outstanding balance, and liquidity warnings before disbursement."
          eyebrow="Portfolio"
          title="Approved and active loans"
        />
        <div className="mt-5 space-y-3">
          {loans.map((loan) => (
            <DashboardSurfaceCard key={loan.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{loan.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {loan.loanProduct.name} · principal{" "}
                    {formatCurrency(Number(loan.principalAmount))}
                  </p>
                </div>
                <TrendPill
                  tone={
                    loan.status === "active" || loan.status === "disbursed"
                      ? "positive"
                      : "warning"
                  }
                >
                  {loan.status}
                </TrendPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {loan.termMonths} months · monthly servicing{" "}
                {formatCurrency(Number(loan.estimatedMonthlyServicing))} · extra savings{" "}
                {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Outstanding {formatCurrency(Number(loan.outstandingPrincipal))}
              </p>
              {loan.status === "approved" &&
              Number(loan.principalAmount) > Number(dashboard.availablePool) ? (
                <p className="mt-3 text-sm text-destructive">
                  Liquidity warning: principal exceeds the currently reported available pool.
                </p>
              ) : null}
              {loan.status === "approved" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Projected pool after disbursement:{" "}
                  {formatCurrency(Number(dashboard.availablePool) - Number(loan.principalAmount))}
                </p>
              ) : null}
              {canReview && loan.status === "approved" ? (
                <div className="mt-4">
                  <LoanDisbursementForm loanId={loan.id} />
                </div>
              ) : null}
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
