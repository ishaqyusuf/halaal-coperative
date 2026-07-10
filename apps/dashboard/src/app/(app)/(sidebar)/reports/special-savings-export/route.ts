import { listContributions } from "@halaalvest/db"
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
    Object.fromEntries(searchParams.entries()),
  )
  const memberId = searchParams.get("memberId") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const contributions = await listContributions(context.tenant.id, {
    fromDate: filters.fromDate,
    memberId: memberId || undefined,
    page: 1,
    pageSize: 500,
    search: search || undefined,
    specialSavingsOnly: true,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    [
      "Posted At",
      "Member",
      "Member Number",
      "Special Savings Amount",
      "Committed Amount",
      "Total Payment Amount",
      "Channel",
      "Status",
      "Period Label",
      "Reference",
    ],
    contributions.items.map((contribution) => [
      contribution.postedAt.toISOString(),
      contribution.member?.fullName ?? "",
      contribution.member?.memberNumber ?? "",
      Number(contribution.extraSavingsAmount ?? 0),
      contribution.committedAmount ? Number(contribution.committedAmount) : "",
      Number(contribution.amount),
      contribution.channel,
      contribution.status,
      contribution.periodLabel ?? "",
      contribution.reference ?? "",
    ]),
  )

  return createCsvResponse(
    `${context.tenant.slug}-special-savings-report.csv`,
    csv,
  )
}
