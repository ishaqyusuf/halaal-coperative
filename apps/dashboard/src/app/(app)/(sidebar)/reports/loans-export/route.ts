import { listLoans, listLoanRequests } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const [loans, requests] = await Promise.all([
    listLoans(context.tenant.id),
    listLoanRequests(context.tenant.id),
  ])

  const csv = toCsv(
    [
      "Record Type",
      "Member",
      "Member Number",
      "Product",
      "Requested Amount",
      "Principal Amount",
      "Outstanding Principal",
      "Requested Term Months",
      "Loan Term Months",
      "Estimated Monthly Servicing",
      "Extra Monthly Savings Amount",
      "Status",
    ],
    [
      ...requests
        .filter((request) => {
          const requestedAt = request.requestedAt
          if (filters.fromDate && requestedAt < filters.fromDate) return false
          if (filters.toDate && requestedAt > filters.toDate) return false
          return true
        })
        .map((request) => [
        "request",
        request.member.fullName,
        request.member.memberNumber,
        request.loanProduct.name,
        Number(request.requestedAmount),
        "",
        "",
        request.requestedTermMonths,
        "",
        Number(request.estimatedMonthlyServicing),
        Number(request.extraMonthlySavingsAmount),
        request.status,
      ]),
      ...loans
        .filter((loan) => {
          const createdAt = loan.createdAt
          if (filters.fromDate && createdAt < filters.fromDate) return false
          if (filters.toDate && createdAt > filters.toDate) return false
          return true
        })
        .map((loan) => [
        "loan",
        loan.member.fullName,
        loan.member.memberNumber,
        loan.loanProduct.name,
        "",
        Number(loan.principalAmount),
        Number(loan.outstandingPrincipal),
        "",
        loan.termMonths,
        Number(loan.estimatedMonthlyServicing),
        Number(loan.extraMonthlySavingsAmount),
        loan.status,
      ]),
    ],
  )

  return createCsvResponse(`${context.tenant.slug}-loans-report.csv`, csv)
}
