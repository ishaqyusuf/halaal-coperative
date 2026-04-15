import { createDbRuntime, listLoanProducts, listLoanRequests, listLoans, listMembers } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
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
      <WorkspacePageShell eyebrow="Loans" title="Loan operations" description="The loan workspace is staged for request review, approval sequencing, and liquidity-aware disbursement.">
        <WorkspaceEmptyState title="Loan workflows need the database runtime." body="Once the database-backed environment is active, this route will manage requests, approvals, disbursement, and repayment setup." />
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
    <WorkspacePageShell eyebrow="Loans" title="Loan operations" description="Review requests, approval history, liquidity posture, and approved loans from a denser credit-control workspace.">
      {canSubmit ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Requests" title="Submit a new loan request" description="Capture product, term months, expected monthly servicing, and extra savings commitment in one request." />
          <div className="mt-5">
            <LoanRequestForm
              devMode={process.env.NODE_ENV !== "production"}
              loanProducts={loanProducts.map((product) => ({ id: product.id, label: `${product.name} (up to ${product.termMonths} months)` }))}
              members={members.items.map((member) => ({ id: member.id, label: `${member.fullName} (${member.memberNumber})` }))}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <DashboardStatCard label="Active loans" value={dashboard.activeLoans.toString()} detail="Currently approved, disbursed, or active loan records." />
        <DashboardStatCard label="Available pool" value={formatCurrency(dashboard.availablePool)} detail="Current liquidity available for approved disbursement." />
        <DashboardStatCard label="Delinquency" value={`${Math.round(dashboard.delinquencyRate * 100)}%`} detail="Share of active facilities with overdue repayment items." tone={dashboard.delinquencyRate > 0.08 ? "warning" : "default"} />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Reviews" title="Loan requests queue" description="Review request context, approval history, and monthly servicing before the request becomes a live loan." actions={<TrendPill>{loanRequests.length} requests</TrendPill>} />
        <div className="mt-5 space-y-3">
          {loanRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{request.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">{request.loanProduct.name} · {formatCurrency(Number(request.requestedAmount))} requested</p>
                </div>
                <TrendPill tone={request.status === "approved" ? "positive" : "warning"}>{request.status.replace(/_/g, " ")}</TrendPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {request.requestedTermMonths} months · estimated servicing {formatCurrency(Number(request.estimatedMonthlyServicing))} · extra savings {formatCurrency(Number(request.extraMonthlySavingsAmount))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Eligible snapshot {formatCurrency(Number(request.eligibleAmountSnapshot))}{request.reviewNotes ? ` · ${request.reviewNotes}` : ""}
              </p>
              {request.approvals.length ? (
                <div className="mt-3 rounded-2xl border border-border/70 bg-card p-3 text-xs text-muted-foreground">
                  {request.approvals.map((approval) => (
                    <p key={approval.id}>
                      {approval.action} · {approval.actorUser.fullName} · {approval.actedAt.toISOString().slice(0, 10)}
                      {approval.notes ? ` · ${approval.notes}` : ""}
                    </p>
                  ))}
                </div>
              ) : null}
              {request.purpose ? <p className="mt-3 text-sm text-muted-foreground">{request.purpose}</p> : null}
              {canReview ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.status !== "approved" ? <LoanReviewForm defaultValues={{ loanRequestId: request.id, notes: "", status: "approved" }} label="Approve" /> : null}
                  {request.status !== "rejected" ? <LoanReviewForm defaultValues={{ loanRequestId: request.id, notes: "", status: "rejected" }} label="Reject" variant="outline" /> : null}
                  {request.status === "submitted" ? <LoanReviewForm defaultValues={{ loanRequestId: request.id, notes: "", status: "under_review" }} label="Mark under review" variant="outline" /> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Portfolio" title="Approved and active loans" description="Review live principal, outstanding balance, and liquidity warnings before disbursement." actions={<TrendPill>{loans.length} loans</TrendPill>} />
        <div className="mt-5 space-y-3">
          {loans.map((loan) => (
            <div key={loan.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{loan.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">{loan.loanProduct.name} · principal {formatCurrency(Number(loan.principalAmount))}</p>
                </div>
                <TrendPill tone={loan.status === "active" || loan.status === "disbursed" ? "positive" : "warning"}>{loan.status}</TrendPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {loan.termMonths} months · monthly servicing {formatCurrency(Number(loan.estimatedMonthlyServicing))} · extra savings {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Outstanding {formatCurrency(Number(loan.outstandingPrincipal))}</p>
              {loan.status === "approved" && Number(loan.principalAmount) > Number(dashboard.availablePool) ? (
                <p className="mt-3 text-sm text-destructive">Liquidity warning: principal exceeds the currently reported available pool.</p>
              ) : null}
              {loan.status === "approved" ? (
                <p className="mt-1 text-xs text-muted-foreground">Projected pool after disbursement: {formatCurrency(Number(dashboard.availablePool) - Number(loan.principalAmount))}</p>
              ) : null}
              {canReview && loan.status === "approved" ? <div className="mt-4"><LoanDisbursementForm loanId={loan.id} /></div> : null}
            </div>
          ))}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
