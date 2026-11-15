import { listActivityReportEvents } from "@halaalvest/db"
import {
  createCsvStreamResponse,
  getReportsDateFilters,
  lastIdCursor,
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
  const tenantId = context.tenant.id
  const batches = readExportBatches(async ({ cursor, limit }) => {
    const rows = await listActivityReportEvents(tenantId, {
      cursor,
      fromDate: filters.fromDate,
      limit,
      toDate: filters.toDate,
    })

    return { nextCursor: lastIdCursor(rows, limit), rows }
  })

  return createCsvStreamResponse(
    `${context.tenant.slug}-audit-report.csv`,
    [
      "When",
      "What happened",
      "Who",
      "Record",
      "Record id",
      "Approved or checked by",
      "Details",
    ],
    mapExportBatches(batches, (logs) =>
      logs.map((log) => [
        log.occurredAt.toISOString(),
        log.actionLabel,
        log.actorLabel,
        log.entityLabel,
        log.entityId ?? "",
        log.authorizerUserId ? log.authorizerLabel : "",
        log.metadataSummary.join("; "),
      ])
    )
  )
}
