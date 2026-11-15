import { listContributions } from "@halaalvest/db"
import {
  createCsvStreamResponse,
  getReportsDateFilters,
  mapExportBatches,
  readExportBatches,
  requireReportsExportContext,
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
  const channel = searchParams.get("channel") ?? undefined
  const memberId = searchParams.get("memberId") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const tenantId = context.tenant.id
  const batches = readExportBatches(async ({ cursor, limit }) => {
    const result = await listContributions(tenantId, {
      channel:
        channel === "payroll" ||
        channel === "transfer" ||
        channel === "cash" ||
        channel === "manual"
          ? channel
          : undefined,
      cursor,
      fromDate: filters.fromDate,
      includeTotal: false,
      memberId: memberId || undefined,
      pageSize: limit,
      search: search || undefined,
      toDate: filters.toDate,
    })

    return { nextCursor: result.nextCursor, rows: result.items }
  })

  return createCsvStreamResponse(
    `${context.tenant.slug}-contributions-report.csv`,
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
    mapExportBatches(batches, (contributions) =>
      contributions.map((contribution) => [
        contribution.postedAt.toISOString(),
        contribution.member?.fullName ?? "",
        contribution.member?.memberNumber ?? "",
        Number(contribution.amount),
        contribution.committedAmount
          ? Number(contribution.committedAmount)
          : "",
        Number(contribution.extraSavingsAmount ?? 0),
        contribution.channel,
        contribution.status,
        contribution.periodLabel ?? "",
        contribution.reference ?? "",
      ])
    )
  )
}
