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
} from "@/components/dashboard/static-table"
import { LoanDisbursementForm } from "@/components/forms/finance-forms"

type LoanPortfolioRow = {
  estimatedMonthlyServicing: number | string | { toString(): string }
  extraMonthlySavingsAmount: number | string | { toString(): string }
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  outstandingPrincipal: number | string | { toString(): string }
  principalAmount: number | string | { toString(): string }
  status: string
  termMonths: number
}

export function LoanPortfolioTable({
  availablePool,
  canReview,
  items,
}: {
  availablePool: number
  canReview: boolean
  items: LoanPortfolioRow[]
}) {
  if (!items.length) {
    return (
      <TableEmptyState
        title="No approved or active loans"
        body="Approved and live cooperative loans will appear here once requests move into servicing."
      />
    )
  }

  return (
    <DashboardDataTable>
      <DashboardTable>
        <DashboardTableHead>
          <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Loan</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
          <DashboardTableHeaderCell>Servicing</DashboardTableHeaderCell>
        </DashboardTableHead>
        <DashboardTableBody>
          {items.map((loan) => (
            <DashboardTableRow key={loan.id}>
              <DashboardTableCell>
                <p className="font-medium text-foreground">{loan.member.fullName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loan.termMonths} months
                </p>
              </DashboardTableCell>
              <DashboardTableCell>
                <p className="text-sm text-foreground">
                  {loan.loanProduct.name} · principal {formatCurrency(Number(loan.principalAmount))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Outstanding {formatCurrency(Number(loan.outstandingPrincipal))}
                </p>
              </DashboardTableCell>
              <DashboardTableCell>
                <span className="capitalize text-muted-foreground">{loan.status}</span>
                {loan.status === "approved" &&
                Number(loan.principalAmount) > Number(availablePool) ? (
                  <p className="mt-2 text-xs text-destructive">
                    Liquidity warning
                  </p>
                ) : null}
              </DashboardTableCell>
              <DashboardTableCell>
                <p className="text-sm text-foreground">
                  {formatCurrency(Number(loan.estimatedMonthlyServicing))} monthly
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extra savings {formatCurrency(Number(loan.extraMonthlySavingsAmount))}
                </p>
                {loan.status === "approved" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Projected pool after disbursement:{" "}
                    {formatCurrency(Number(availablePool) - Number(loan.principalAmount))}
                  </p>
                ) : null}
                {canReview && loan.status === "approved" ? (
                  <div className="mt-3">
                    <LoanDisbursementForm loanId={loan.id} />
                  </div>
                ) : null}
              </DashboardTableCell>
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}
