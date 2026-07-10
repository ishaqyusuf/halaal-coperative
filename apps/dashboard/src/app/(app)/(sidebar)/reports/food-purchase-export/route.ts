import {
  listFoodPurchaseApplications,
  listFoodPurchaseCycles,
} from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
} from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries())
  )
  const [cycles, applications] = await Promise.all([
    listFoodPurchaseCycles({
      limit: 1000,
      tenantId: context.tenant.id,
    }),
    listFoodPurchaseApplications({
      limit: 1000,
      tenantId: context.tenant.id,
    }),
  ])
  const cycleRows = cycles
    .filter((cycle) => {
      if (filters.fromDate && cycle.releasedAt < filters.fromDate) {
        return false
      }

      if (filters.toDate && cycle.releasedAt > filters.toDate) {
        return false
      }

      return true
    })
    .map((cycle) => [
      "cycle",
      cycle.id,
      cycle.periodMonth.toISOString().slice(0, 10),
      cycle.status,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      cycle.releasedAmount,
      "",
      "",
      "",
      "",
      cycle.releasedAt.toISOString(),
      cycle.releasedByUser.fullName,
      cycle.releaseNotes ?? "",
      cycle.salesAmount ?? "",
      cycle.purchaseCostAmount ?? "",
      cycle.operatingExpenseAmount ?? "",
      cycle.profitAmount ?? "",
      cycle.accountingSubmittedByUser?.fullName ?? "",
      cycle.accountingSubmittedAt?.toISOString() ?? "",
      cycle.accountingNotes ?? "",
    ])
  const applicationRows = applications
    .filter((application) => {
      if (filters.fromDate && application.requestedAt < filters.fromDate) {
        return false
      }

      if (filters.toDate && application.requestedAt > filters.toDate) {
        return false
      }

      return true
    })
    .map((application) => {
      const approvedAmount = application.approvedAmount ?? 0
      const outstandingAmount = Math.max(
        approvedAmount - application.paidAmount,
        0
      )

      return [
        "application",
        application.id,
        application.cycle.periodMonth.toISOString().slice(0, 10),
        application.status,
        application.member.fullName,
        application.member.memberNumber,
        application.itemDescription ?? "",
        application.requestedAmount,
        application.requestedPaybackMonths,
        application.approvedAmount ?? "",
        application.approvedPaybackMonths ?? "",
        application.policyMaximumPaybackMonths,
        application.allowsCommitmentReductionDuringPayback ? "yes" : "no",
        "",
        application.cycle.releasedAmount,
        application.paidAmount,
        outstandingAmount,
        application.paidAt?.toISOString() ?? "",
        application.requestedAt.toISOString(),
        application.submittedByUser.fullName,
        application.requestNotes ?? "",
        "",
        "",
        "",
        "",
        application.reviewedByUser?.fullName ?? "",
        application.reviewedAt?.toISOString() ?? "",
        application.reviewNotes ?? "",
      ]
    })
  const csv = toCsv(
    [
      "Record Type",
      "Record Id",
      "Period Month",
      "Status",
      "Member",
      "Member Number",
      "Item Or Description",
      "Requested Amount",
      "Requested Payback Months",
      "Approved Amount",
      "Approved Payback Months",
      "Policy Max Payback Months",
      "Allows Commitment Reduction During Payback",
      "Released Amount",
      "Cycle Released Amount",
      "Paid Amount",
      "Outstanding Amount",
      "Paid At",
      "Recorded At",
      "Recorded By",
      "Notes",
      "Sales Amount",
      "Purchase Cost Amount",
      "Operating Expense Amount",
      "Profit Amount",
      "Reviewed Or Accounting By",
      "Reviewed Or Accounting At",
      "Review Or Accounting Notes",
    ],
    [...cycleRows, ...applicationRows]
  )

  return createCsvResponse(
    `${context.tenant.slug}-food-purchase-report.csv`,
    csv
  )
}
