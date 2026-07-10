import { listCollectionFollowUps, listRepaymentScheduleItems } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const [followUps, items] = await Promise.all([
    listCollectionFollowUps(context.tenant.id, {
      fromDate: filters.fromDate,
      limit: 1000,
      toDate: filters.toDate,
    }),
    listRepaymentScheduleItems(context.tenant.id, {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
  ])
  const latestFollowUpByScheduleItemId = new Map(
    followUps.map((followUp) => [followUp.repaymentScheduleItemId, followUp]),
  )
  const csv = toCsv(
    [
      "Member",
      "Member Number",
      "Loan Product",
      "Loan Product Code",
      "Installment",
      "Due At",
      "Status",
      "Total Due",
      "Amount Paid",
      "Outstanding",
      "Latest Follow-up Status",
      "Latest Follow-up Note",
      "Next Action At",
    ],
    items.map((item) => {
      const latestFollowUp = latestFollowUpByScheduleItemId.get(item.id)

      return [
        item.loan.member.fullName,
        item.loan.member.memberNumber,
        item.loan.loanProduct.name,
        item.loan.loanProduct.code ?? "",
        item.installmentNumber,
        item.dueAt.toISOString().slice(0, 10),
        item.status,
        Number(item.totalDue),
        Number(item.amountPaid),
        Number(item.totalDue) - Number(item.amountPaid),
        latestFollowUp?.status ?? "",
        latestFollowUp?.note ?? "",
        latestFollowUp?.nextActionAt?.toISOString().slice(0, 10) ?? "",
      ]
    }),
  )

  return createCsvResponse(`${context.tenant.slug}-collections-report.csv`, csv)
}
