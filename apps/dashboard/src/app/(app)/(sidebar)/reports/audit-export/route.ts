import { listAuditLogs } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const logs = await listAuditLogs(context.tenant.id, {
    fromDate: filters.fromDate,
    limit: 500,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    ["Occurred At", "Action", "Actor Type", "Actor Name", "Entity Type", "Entity Id"],
    logs.map((log) => [
      log.occurredAt.toISOString(),
      log.action,
      log.actorType,
      log.actorUser?.fullName ?? "",
      log.entityType,
      log.entityId ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-audit-report.csv`, csv)
}
