import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TableEmptyState,
} from "@/components/tables/core"
import { DashboardSurfaceCard } from "@/components/dashboard"
import { LoanReviewForm } from "@/components/forms/finance-forms"

type LoanRequestRow = {
  approvals: Array<{
    action: string
    actedAt: Date
    actorUser: { fullName: string }
    id: string
    notes?: string | null
  }>
  eligibleAmountSnapshot: number | string | { toString(): string }
  estimatedMonthlyServicing: number | string | { toString(): string }
  extraMonthlySavingsAmount: number | string | { toString(): string }
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  purpose?: string | null
  requestedAmount: number | string | { toString(): string }
  requestedTermMonths: number
  reviewNotes?: string | null
  status: string
}

export function LoanRequestsTable({
  canReview,
  items,
}: {
  canReview: boolean
  items: LoanRequestRow[]
}) {
  if (!items.length) {
    return (
      <TableEmptyState
        title="No loan requests yet"
        body="Submitted member loan requests will appear here for review and approval."
      />
    )
  }

  return (
    <DashboardDataTable>
      <DashboardTable>
        <DashboardTableHead>
          <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Request</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Review</DashboardTableHeaderCell>
        </DashboardTableHead>
        <DashboardTableBody>
          {items.map((request) => (
            <DashboardTableRow key={request.id}>
              <DashboardTableCell>
                <p className="font-medium text-foreground">{request.member.fullName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.requestedTermMonths} months
                </p>
              </DashboardTableCell>
              <DashboardTableCell>
                <p className="text-sm text-foreground">
                  {request.loanProduct.name} · {formatCurrency(Number(request.requestedAmount))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monthly servicing {formatCurrency(Number(request.estimatedMonthlyServicing))} · extra savings{" "}
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
                        {approval.action} · {approval.actorUser.fullName} · {approval.actedAt.toISOString().slice(0, 10)}
                        {approval.notes ? ` · ${approval.notes}` : ""}
                      </p>
                    ))}
                  </DashboardSurfaceCard>
                ) : null}
                {request.purpose ? (
                  <p className="mt-2 text-sm text-muted-foreground">{request.purpose}</p>
                ) : null}
              </DashboardTableCell>
              <DashboardTableCell>
                <span className="capitalize text-muted-foreground">
                  {request.status.replace(/_/g, " ")}
                </span>
              </DashboardTableCell>
              <DashboardTableCell>
                {canReview ? (
                  <div className="flex flex-wrap gap-2">
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
                ) : (
                  <span className="text-sm text-muted-foreground">View only</span>
                )}
              </DashboardTableCell>
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}
