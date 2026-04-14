import { listMemberStatementSummaries } from "@halaal-vest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const statements = (await listMemberStatementSummaries(context.tenant.id)).filter((statement) => {
    if (filters.fromDate && statement.joinedAt < filters.fromDate) return false
    if (filters.toDate && statement.joinedAt > filters.toDate) return false
    return true
  })
  const csv = toCsv(
    [
      "Member",
      "Member Number",
      "Email",
      "Member Type",
      "Status",
      "Joined At",
      "Exited At",
      "Deduction Source",
      "Active Commitment Amount",
      "Commitment Starts At",
      "Savings Snapshot",
      "Total Contributions",
      "Total Committed Contributions",
      "Total Extra Savings Contributions",
      "Contribution Count",
      "Last Contribution At",
      "Active Loan Count",
      "Total Loan Principal",
      "Total Outstanding Principal",
      "Estimated Monthly Servicing",
      "Loan Extra Savings Amount",
      "Total Repayments Posted",
      "Last Repayment At",
    ],
    statements.map((statement) => [
      statement.fullName,
      statement.memberNumber,
      statement.email ?? "",
      statement.memberType,
      statement.status,
      statement.joinedAt.toISOString(),
      statement.exitedAt?.toISOString() ?? "",
      statement.deductionSourceName ?? "",
      statement.activeCommitmentAmount,
      statement.activeCommitmentStartsAt?.toISOString() ?? "",
      statement.totalSavingsSnapshot,
      statement.totalContributions,
      statement.totalCommittedContributions,
      statement.totalExtraSavingsContributions,
      statement.contributionsCount,
      statement.lastContributionAt?.toISOString() ?? "",
      statement.activeLoanCount,
      statement.totalLoanPrincipal,
      statement.totalOutstandingPrincipal,
      statement.totalEstimatedMonthlyServicing,
      statement.totalLoanExtraSavingsAmount,
      statement.totalRepaymentsPosted,
      statement.lastRepaymentAt?.toISOString() ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-member-statements.csv`, csv)
}
