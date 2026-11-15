import { listAuditLogs } from "@halaalvest/db"
import {
  createCsvStreamResponse,
  getReportsDateFilters,
  lastIdCursor,
  mapExportBatches,
  readExportBatches,
  requireReportsExportContext,
} from "../export-utils"

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
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries())
  )
  const search = searchParams.get("search") ?? undefined
  const status = searchParams.get("status")
  const type = searchParams.get("type") ?? undefined
  const tenantId = context.tenant.id
  const batches = readExportBatches(async ({ cursor, limit }) => {
    const rows = await listAuditLogs(tenantId, {
      action:
        status === "queued" || status === "sent" || status === "failed"
          ? `notification.email_${status}`
          : "notification.email",
      cursor,
      fromDate: filters.fromDate,
      limit,
      search: search || undefined,
      toDate: filters.toDate,
    })

    return { nextCursor: lastIdCursor(rows, limit), rows }
  })

  return createCsvStreamResponse(
    `${context.tenant.slug}-notification-report.csv`,
    [
      "Created At",
      "Recipient",
      "Notification Type",
      "Status",
      "Attempts",
      "Message ID",
      "Source",
    ],
    mapExportBatches(batches, (logs) =>
      (type
        ? logs.filter(
            (entry) =>
              getMetadataString(entry.metadata, "notificationType") === type
          )
        : logs
      ).map((entry) => [
        entry.occurredAt.toISOString(),
        getMetadataString(entry.metadata, "recipient") ?? "",
        getMetadataString(entry.metadata, "notificationType") ?? "",
        getDeliveryStatus(entry.action),
        getMetadataCsvValue(entry.metadata, "attempts"),
        entry.entityId ?? "",
        getMetadataString(entry.metadata, "source") ?? "",
      ])
    )
  )
}
