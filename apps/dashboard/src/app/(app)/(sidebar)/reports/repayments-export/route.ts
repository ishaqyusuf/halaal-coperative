import { listRepayments } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const repayments = await listRepayments(context.tenant.id, {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })

  const csv = toCsv(
    [
      "Paid At",
      "Member",
      "Member Number",
      "Loan Product",
      "Loan Product Code",
      "Amount",
      "Status",
      "Reference",
    ],
    repayments.map((repayment) => [
      repayment.paidAt.toISOString(),
      repayment.member.fullName,
      repayment.member.memberNumber,
      repayment.loan.loanProduct.name,
      repayment.loan.loanProduct.code ?? "",
      Number(repayment.amount),
      repayment.status,
      repayment.reference ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-repayments-report.csv`, csv)
}
