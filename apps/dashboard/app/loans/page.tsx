import { createDbRuntime, listLoanProducts, listLoanRequests, listLoans, listMembers } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import { LoanDisbursementForm, LoanRequestForm, LoanReviewForm } from "@/features/forms/finance-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function LoansPage() {
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Loans"
        title="Loan operations"
        description="The loan workspace is staged for request review, approval sequencing, and liquidity-aware disbursement."
      >
        <WorkspaceEmptyState
          title="Loan workflows need the database runtime."
          body="Once the database-backed environment is active, this route will manage requests, approvals, disbursement, and repayment setup."
        />
      </WorkspacePageShell>
    )
  }

  const [members, loanProducts, loanRequests, loans] = await Promise.all([
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listLoanProducts(context.tenant.id),
    listLoanRequests(context.tenant.id),
    listLoans(context.tenant.id),
  ])

  const canSubmit = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canReview = hasAnyRole(context.auth.membership?.role, financeManagementRoles)

  return (
    <WorkspacePageShell
      eyebrow="Loans"
      title="Loan operations"
      description="Members choose how many months to repay, the system calculates an estimated monthly servicing amount, and any extra fixed monthly savings remains in the member account."
    >
      {canSubmit ? (
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
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active loans</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{dashboard.activeLoans}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Available pool</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{formatCurrency(dashboard.availablePool)}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delinquency</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{Math.round(dashboard.delinquencyRate * 100)}%</p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Loan requests</h3>
        </div>
        <div className="divide-y divide-border/60">
          {loanRequests.map((request) => (
            <div key={request.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{request.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.loanProduct.name} · {formatCurrency(Number(request.requestedAmount))} requested
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {request.status.replace(/_/g, " ")} · eligible {formatCurrency(Number(request.eligibleAmountSnapshot))}
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {request.requestedTermMonths} months · estimated servicing {formatCurrency(Number(request.estimatedMonthlyServicing))}
                {" · "}extra savings {formatCurrency(Number(request.extraMonthlySavingsAmount))}
              </p>
              <p className="text-xs text-muted-foreground">
                Approvals: {request.approvals.filter((approval) => approval.action === "approved").length}
                {request.reviewNotes ? ` · latest notes: ${request.reviewNotes}` : ""}
              </p>
              {request.approvals.length ? (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  {request.approvals.map((approval) => (
                    <p key={approval.id}>
                      {approval.action} · {approval.actorUser.fullName} · {approval.actedAt.toISOString().slice(0, 10)}
                      {approval.notes ? ` · ${approval.notes}` : ""}
                    </p>
                  ))}
                </div>
              ) : null}
              {request.purpose ? <p className="text-sm leading-6 text-muted-foreground">{request.purpose}</p> : null}
              {canReview ? (
                <div className="flex flex-wrap gap-2">
                  {request.status !== "approved" ? (
                    <LoanReviewForm
                      defaultValues={{
                        loanRequestId: request.id,
                        notes: "",
                        status: "approved",
                      }}
                      label="Approve"
                    />
                  ) : null}
                  {request.status !== "rejected" ? (
                    <LoanReviewForm
                      defaultValues={{
                        loanRequestId: request.id,
                        notes: "",
                        status: "rejected",
                      }}
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
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Approved and active loans</h3>
        </div>
        <div className="divide-y divide-border/60">
          {loans.map((loan) => (
            <div key={loan.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{loan.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {loan.loanProduct.name} · principal {formatCurrency(Number(loan.principalAmount))}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {loan.status} · outstanding {formatCurrency(Number(loan.outstandingPrincipal))}
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {loan.termMonths} months · monthly servicing {formatCurrency(Number(loan.estimatedMonthlyServicing))}
                {" · "}extra savings {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
              </p>
              {loan.status === "approved" && Number(loan.principalAmount) > Number(dashboard.availablePool) ? (
                <p className="text-sm text-destructive">
                  Liquidity warning: principal exceeds the currently reported available pool.
                </p>
              ) : null}
              {loan.status === "approved" ? (
                <p className="text-xs text-muted-foreground">
                  Projected available pool after disbursement: {formatCurrency(Number(dashboard.availablePool) - Number(loan.principalAmount))}
                </p>
              ) : null}
              {canReview && loan.status === "approved" ? (
                <LoanDisbursementForm loanId={loan.id} />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
