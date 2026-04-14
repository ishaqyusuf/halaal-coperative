import { listContributions } from "@halaal-vest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const channel = searchParams.get("channel") ?? undefined
  const memberId = searchParams.get("memberId") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const contributions = await listContributions(context.tenant.id, {
    channel: channel === "payroll" || channel === "transfer" || channel === "cash" || channel === "manual" ? channel : undefined,
    fromDate: filters.fromDate,
    memberId: memberId || undefined,
    page: 1,
    pageSize: 500,
    search: search || undefined,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    [
      "Posted At",
      "Member",
      "Member Number",
      "Amount",
      "Committed Amount",
      "Extra Savings Amount",
      "Channel",
      "Status",
      "Period Label",
      "Reference",
    ],
    contributions.items.map((contribution) => [
      contribution.postedAt.toISOString(),
      contribution.member?.fullName ?? "",
      contribution.member?.memberNumber ?? "",
      Number(contribution.amount),
      contribution.committedAmount ? Number(contribution.committedAmount) : "",
      Number(contribution.extraSavingsAmount ?? 0),
      contribution.channel,
      contribution.status,
      contribution.periodLabel ?? "",
      contribution.reference ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-contributions-report.csv`, csv)
}
