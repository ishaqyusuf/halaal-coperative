import { listProjectFinancingRequests } from "@halaalvest/db"
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
  const requests = await listProjectFinancingRequests({
    limit: 1000,
    tenantId: context.tenant.id,
  })
  const csv = toCsv(
    [
      "Request Id",
      "Requested At",
      "Updated At",
      "Member",
      "Member Number",
      "Business Name",
      "Status",
      "Proposed Structure",
      "Requested Amount",
      "Requested Payback Months",
      "Estimated Monthly Payback",
      "Project Purpose",
      "Business Description",
      "Approved Structure",
      "Approved Amount",
      "Approved Payback Months",
      "Approved Monthly Payback",
      "Paid Amount",
      "Outstanding Amount",
      "Paid At",
      "Disbursed At",
      "Disbursed By",
      "Disbursement Reference",
      "Disbursement Notes",
      "Reviewed By",
      "Reviewed At",
      "Review Notes",
      "Created By",
    ],
    requests
      .filter((projectRequest) => {
        if (
          filters.fromDate &&
          projectRequest.requestedAt < filters.fromDate
        ) {
          return false
        }

        if (filters.toDate && projectRequest.requestedAt > filters.toDate) {
          return false
        }

        return true
      })
      .map((projectRequest) => {
        const approvedAmount = projectRequest.approvedAmount ?? 0
        const outstandingAmount = Math.max(
          approvedAmount - projectRequest.paidAmount,
          0,
        )

        return [
          projectRequest.id,
          projectRequest.requestedAt.toISOString(),
          projectRequest.updatedAt.toISOString(),
          projectRequest.member.fullName,
          projectRequest.member.memberNumber,
          projectRequest.businessName,
          projectRequest.status,
          projectRequest.proposedStructure,
          projectRequest.requestedAmount,
          projectRequest.requestedPaybackMonths ?? "",
          projectRequest.estimatedMonthlyPayback ?? "",
          projectRequest.projectPurpose ?? "",
          projectRequest.businessDescription ?? "",
          projectRequest.approvedStructure ?? "",
          projectRequest.approvedAmount ?? "",
          projectRequest.approvedPaybackMonths ?? "",
          projectRequest.approvedMonthlyPayback ?? "",
          projectRequest.paidAmount,
          outstandingAmount,
          projectRequest.paidAt?.toISOString() ?? "",
          projectRequest.disbursedAt?.toISOString() ?? "",
          projectRequest.disbursedByUser?.fullName ?? "",
          projectRequest.disbursementReference ?? "",
          projectRequest.disbursementNotes ?? "",
          projectRequest.reviewedByUser?.fullName ?? "",
          projectRequest.reviewedAt?.toISOString() ?? "",
          projectRequest.reviewNotes ?? "",
          projectRequest.createdByUser.fullName,
        ]
      })
  )

  return createCsvResponse(
    `${context.tenant.slug}-project-financing-report.csv`,
    csv
  )
}
