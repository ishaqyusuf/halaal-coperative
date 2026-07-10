import { listMemberPaymentReceipts } from "@halaalvest/db"
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
  const receipts = await listMemberPaymentReceipts(context.tenant.id, {
    limit: 5000,
    submittedFrom: filters.fromDate,
    submittedTo: filters.toDate,
  })
  const csv = toCsv(
    [
      "Receipt Id",
      "Submitted At",
      "Paid At",
      "Member",
      "Member Number",
      "Member Email",
      "Status",
      "Total Amount",
      "Channel",
      "Payment Reference",
      "Proof Document Name",
      "Proof Document Url",
      "Member Notes",
      "Reviewed At",
      "Reviewed By User Id",
      "Review Notes",
      "Allocation Id",
      "Allocation Category",
      "Allocation Amount",
      "Period Intent",
      "Target Period Start",
      "Contribution Plan Id",
      "Loan Id",
      "Procurement Schedule Item Id",
      "Foodstuff Purchase Application Id",
      "Project Financing Request Id",
      "Posted Contribution Id",
      "Posted Repayment Id",
      "Posted Share Ledger Entry Id",
      "Allocation Notes",
      "Created At",
      "Updated At",
    ],
    receipts.flatMap((receipt) =>
      receipt.allocations.map((allocation) => [
        receipt.id,
        receipt.submittedAt.toISOString(),
        receipt.paidAt.toISOString(),
        receipt.member.fullName,
        receipt.member.memberNumber,
        receipt.member.email ?? "",
        receipt.status,
        receipt.totalAmount,
        receipt.channel,
        receipt.paymentReference ?? "",
        receipt.proofDocumentName ?? "",
        receipt.proofDocumentUrl ?? "",
        receipt.memberNotes ?? "",
        receipt.reviewedAt?.toISOString() ?? "",
        receipt.reviewedByUserId ?? "",
        receipt.reviewNotes ?? "",
        allocation.id,
        allocation.category,
        allocation.amount,
        allocation.periodIntent,
        allocation.targetPeriodStart?.toISOString() ?? "",
        allocation.contributionPlanId ?? "",
        allocation.loanId ?? "",
        allocation.procurementRepaymentScheduleItemId ?? "",
        allocation.foodPurchaseApplicationId ?? "",
        allocation.projectFinancingRequestId ?? "",
        allocation.postedContributionId ?? "",
        allocation.postedRepaymentId ?? "",
        allocation.postedShareLedgerEntryId ?? "",
        allocation.notes ?? "",
        receipt.createdAt.toISOString(),
        receipt.updatedAt.toISOString(),
      ])
    )
  )

  return createCsvResponse(`${context.tenant.slug}-payment-receipts.csv`, csv)
}
