import {
  listMemberOpeningBalances,
  type MemberOpeningBalanceStatus,
} from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
} from "../export-utils"

const openingBalanceStatuses = new Set<MemberOpeningBalanceStatus>([
  "pending_review",
  "approved",
  "applied",
  "reversed",
  "rejected",
  "cancelled",
])

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries()),
  )
  const status = searchParams.get("status") ?? undefined
  const memberId = searchParams.get("memberId") ?? undefined
  const openingBalances = await listMemberOpeningBalances({
    fromDate: filters.fromDate,
    limit: 5000,
    memberId: memberId || undefined,
    status:
      status && openingBalanceStatuses.has(status as MemberOpeningBalanceStatus)
        ? (status as MemberOpeningBalanceStatus)
        : undefined,
    tenantId: context.tenant.id,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    [
      "Opening Balance Id",
      "Member",
      "Member Number",
      "Opening Date",
      "Status",
      "Commitment Savings Balance",
      "Special Savings Balance",
      "Share Capital Balance",
      "Share Units",
      "Active Financing Outstanding",
      "Procurement Outstanding",
      "Source Document Name",
      "Source Document Url",
      "Notes",
      "Reviewed At",
      "Reviewed By User Id",
      "Review Notes",
      "Applied At",
      "Applied By User Id",
      "Applied Loan Id",
      "Applied Procurement Request Id",
      "Reversed At",
      "Reversed By User Id",
      "Reversal Notes",
      "Created At",
      "Updated At",
    ],
    openingBalances.map((row) => [
      row.id,
      row.member.fullName,
      row.member.memberNumber,
      row.openingDate.toISOString(),
      row.status,
      row.commitmentSavingsBalance,
      row.specialSavingsBalance,
      row.shareCapitalBalance,
      row.shareUnits ?? "",
      row.activeFinancingOutstanding,
      row.procurementOutstanding,
      row.sourceDocumentName ?? "",
      row.sourceDocumentUrl ?? "",
      row.notes ?? "",
      row.reviewedAt?.toISOString() ?? "",
      row.reviewedByUserId ?? "",
      row.reviewNotes ?? "",
      row.appliedAt?.toISOString() ?? "",
      row.appliedByUserId ?? "",
      row.appliedLoanId ?? "",
      row.appliedProcurementRequestId ?? "",
      row.reversedAt?.toISOString() ?? "",
      row.reversedByUserId ?? "",
      row.reversalNotes ?? "",
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ]),
  )

  return createCsvResponse(
    `${context.tenant.slug}-opening-balances-report.csv`,
    csv,
  )
}
