import { listSupportCases } from "@halaalvest/db"
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
  const cases = await listSupportCases({
    fromDate: filters.fromDate,
    limit: 1000,
    tenantId: context.tenant.id,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    [
      "Created At",
      "Updated At",
      "Subject",
      "Category",
      "Status",
      "Priority",
      "Member",
      "Member Number",
      "Money Impact Requested",
      "Requires Financial Adjustment",
      "Financial Adjustment Approval",
      "Financial Adjustment Reviewer",
      "Financial Adjustment Reviewed At",
      "Financial Adjustment Notes",
      "Linked Record Type",
      "Linked Record Id",
      "Assigned To",
      "Resolution Summary",
      "Resolved At",
      "Closed At",
      "Messages",
      "Last Message At",
    ],
    cases.map((supportCase) => {
      const lastMessage = supportCase.messages.at(-1)

      return [
        supportCase.createdAt.toISOString(),
        supportCase.updatedAt.toISOString(),
        supportCase.subject,
        supportCase.category,
        supportCase.status,
        supportCase.priority,
        supportCase.member?.fullName ?? "",
        supportCase.member?.memberNumber ?? "",
        supportCase.moneyImpactRequested,
        supportCase.requiresFinancialAdjustment,
        supportCase.financialAdjustmentApprovalStatus,
        supportCase.financialAdjustmentApprovedByUser?.fullName ?? "",
        supportCase.financialAdjustmentApprovedAt?.toISOString() ?? "",
        supportCase.financialAdjustmentApprovalNotes ?? "",
        supportCase.linkedRecordType ?? "",
        supportCase.linkedRecordId ?? "",
        supportCase.assignedToUser?.fullName ?? "",
        supportCase.resolutionSummary ?? "",
        supportCase.resolvedAt?.toISOString() ?? "",
        supportCase.closedAt?.toISOString() ?? "",
        supportCase.messages.length,
        lastMessage?.createdAt.toISOString() ?? "",
      ]
    })
  )

  return createCsvResponse(`${context.tenant.slug}-support-cases.csv`, csv)
}
