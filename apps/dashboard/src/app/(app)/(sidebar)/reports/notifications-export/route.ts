import { listNotificationOutboxEntries } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

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
  const entries = await listNotificationOutboxEntries(context.tenant.id, {
    fromDate: filters.fromDate,
    limit: 500,
    notificationType: type || undefined,
    search: search || undefined,
    status: status === "queued" || status === "sent" || status === "failed" ? status : undefined,
    toDate: filters.toDate,
  })
  const csv = toCsv(
    ["Created At", "Recipient", "Notification Type", "Status", "Attempts", "Subject", "Channel"],
    entries.map((entry) => [
      entry.createdAt.toISOString(),
      entry.recipient,
      entry.notificationType,
      entry.status,
      entry.attempts,
      entry.subject,
      entry.channel,
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-notification-report.csv`, csv)
}
