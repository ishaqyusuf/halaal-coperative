import { listAuditLogs } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]

  return typeof value === "string" ? value : null
}

function getMetadataCsvValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return ""
  }

  const value = (metadata as Record<string, unknown>)[key]

  return value === undefined || value === null ? "" : String(value)
}

function getDeliveryStatus(action: string) {
  if (action === "notification.email_sent") return "sent"
  if (action === "notification.email_failed") return "failed"
  if (action === "notification.email_queued") return "queued"

  return "unknown"
}

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const search = searchParams.get("search") ?? undefined
  const status = searchParams.get("status")
  const type = searchParams.get("type") ?? undefined
  const logs = await listAuditLogs(context.tenant.id, {
    action: status === "queued" || status === "sent" || status === "failed" ? `notification.email_${status}` : "notification.email",
    fromDate: filters.fromDate,
    limit: 500,
    search: search || undefined,
    toDate: filters.toDate,
  })
  const entries = type
    ? logs.filter((entry) => getMetadataString(entry.metadata, "notificationType") === type)
    : logs
  const csv = toCsv(
    ["Created At", "Recipient", "Notification Type", "Status", "Attempts", "Message ID", "Source"],
    entries.map((entry) => [
      entry.occurredAt.toISOString(),
      getMetadataString(entry.metadata, "recipient") ?? "",
      getMetadataString(entry.metadata, "notificationType") ?? "",
      getDeliveryStatus(entry.action),
      getMetadataCsvValue(entry.metadata, "attempts"),
      entry.entityId ?? "",
      getMetadataString(entry.metadata, "source") ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-notification-report.csv`, csv)
}
