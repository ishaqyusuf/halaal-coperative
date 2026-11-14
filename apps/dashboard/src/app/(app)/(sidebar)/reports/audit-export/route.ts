import { listActivityReportEvents } from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
  EXPORT_ROW_LIMIT,
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
  const logs = await listActivityReportEvents(context.tenant.id, {
    fromDate: filters.fromDate,
    limit: EXPORT_ROW_LIMIT,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    [
      "When",
      "What happened",
      "Who",
      "Record",
      "Record id",
      "Approved or checked by",
      "Details",
    ],
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

  return createCsvResponse(`${context.tenant.slug}-audit-report.csv`, csv)
}
