import { listProcurementRequests } from "@halaalvest/db"
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
  const requests = await listProcurementRequests({
    limit: 1000,
    tenantId: context.tenant.id,
  })
  const csv = toCsv(
    [
      "Request Id",
      "Requested At",
      "Member",
      "Member Number",
      "Item",
      "Vendor",
      "Status",
      "Requested Cost",
      "Requested Repayment Months",
      "Estimated Monthly Repayment",
      "Approved Cost",
      "Approved Repayment Months",
      "Approved Monthly Repayment",
      "Policy Max Payback Months",
      "Allows Commitment Reduction During Payback",
      "Purchased At",
      "Purchase Reference",
      "Purchase Notes",
      "Outstanding Amount",
      "Due Schedule Items",
      "Overdue Schedule Items",
      "Schedule Risk",
      "Repayment Schedule",
      "Reviewed By",
      "Reviewed At",
      "Review Notes",
      "Description",
      "Created By",
    ],
    requests
      .filter((procurementRequest) => {
        if (
          filters.fromDate &&
          procurementRequest.requestedAt < filters.fromDate
        ) {
          return false
        }

        if (
          filters.toDate &&
          procurementRequest.requestedAt > filters.toDate
        ) {
          return false
        }

        return true
      })
      .map((procurementRequest) => {
        const dueScheduleItems = procurementRequest.repaymentScheduleItems.filter(
          (item) => item.status === "due",
        ).length
        const overdueScheduleItems =
          procurementRequest.repaymentScheduleItems.filter(
            (item) => item.status === "overdue",
          ).length
        const scheduleRisk =
          overdueScheduleItems > 0
            ? "overdue"
            : dueScheduleItems > 0
              ? "due"
              : "clear"

        return [
          procurementRequest.id,
          procurementRequest.requestedAt.toISOString(),
          procurementRequest.member.fullName,
          procurementRequest.member.memberNumber,
          procurementRequest.itemName,
          procurementRequest.vendorName ?? "",
          procurementRequest.status,
          procurementRequest.requestedCost,
          procurementRequest.requestedRepaymentMonths,
          procurementRequest.estimatedMonthlyRepayment,
          procurementRequest.approvedCost ?? "",
          procurementRequest.approvedRepaymentMonths ?? "",
          procurementRequest.approvedMonthlyRepayment ?? "",
          procurementRequest.policyMaximumPaybackMonths,
          procurementRequest.allowsCommitmentReductionDuringPayback
            ? "yes"
            : "no",
          procurementRequest.purchasedAt?.toISOString() ?? "",
          procurementRequest.purchaseReference ?? "",
          procurementRequest.purchaseNotes ?? "",
          procurementRequest.outstandingAmount,
          dueScheduleItems,
          overdueScheduleItems,
          scheduleRisk,
          procurementRequest.repaymentScheduleItems
            .map(
              (item) =>
                `${item.installmentNumber}:${item.dueDate.toISOString().slice(0, 10)}:${item.amount}:${item.status}`,
            )
            .join(" | "),
          procurementRequest.reviewedByUser?.fullName ?? "",
          procurementRequest.reviewedAt?.toISOString() ?? "",
          procurementRequest.reviewNotes ?? "",
          procurementRequest.itemDescription ?? "",
          procurementRequest.createdByUser.fullName,
        ]
      })
  )

  return createCsvResponse(`${context.tenant.slug}-procurement-report.csv`, csv)
}
