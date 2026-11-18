import { resolveDateFilter } from "@halaalvest/utils"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { type CsvCell, readCursorBatches, toCsvStream } from "@/lib/reports/csv"
export { lastIdCursor, toCsv } from "@/lib/reports/csv"

/**
 * Most rows one CSV download holds. Downloads used to stop silently at 500
 * rows; this keeps a ceiling for safety but covers a whole cooperative.
 */
export const EXPORT_ROW_LIMIT = 20_000
/** Rows read per database statement while a download streams. */
export const EXPORT_BATCH_SIZE = 1_000

/**
 * Reads an export's rows in cursor batches of `EXPORT_BATCH_SIZE`, up to
 * `EXPORT_ROW_LIMIT`, so the server never holds the whole download.
 */
export function readExportBatches<T>(
  readBatch: Parameters<typeof readCursorBatches<T>>[0]
) {
  return readCursorBatches(readBatch, {
    batchSize: EXPORT_BATCH_SIZE,
    maxRows: EXPORT_ROW_LIMIT,
  })
}

/** Streams a CSV download built batch by batch (see `readExportBatches`). */
export async function createCsvStreamResponse(
  filename: string,
  headers: string[],
  batches: AsyncIterable<CsvCell[][]>,
  /** Lines before the header row (see `toCsvStream`). */
  preamble?: CsvCell[][]
) {
  return new Response(await toCsvStream(headers, batches, preamble), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

/** Maps each batch of rows to CSV cells. */
export async function* mapExportBatches<T>(
  batches: AsyncIterable<T[]>,
  toRows: (batch: T[]) => CsvCell[][]
): AsyncGenerator<CsvCell[][]> {
  for await (const batch of batches) yield toRows(batch)
}

type ReportsExportContext = Awaited<
  ReturnType<typeof getDashboardServerContext>
>

export async function requireReportsExportContext(): Promise<ReportsExportContext | null> {
  const context = await getDashboardServerContext()

  if (
    !context.tenant ||
    !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)
  ) {
    return null
  }

  return context
}

export function createCsvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

function normalizeSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

export function parseOptionalDateInput(
  value: string | string[] | undefined,
  endOfDay?: boolean
) {
  const normalized = normalizeSearchParamValue(value).trim()

  if (!normalized) {
    return null
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(normalized)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getReportsDateFilters(
  searchParams: Record<string, string | string[] | undefined>
) {
  const rawDateRange = normalizeSearchParamValue(searchParams.dateRange)
  const dateRange = rawDateRange ? rawDateRange.split(",") : null
  const resolvedDateRange = resolveDateFilter(dateRange)

  return {
    dateRange,
    fromDate:
      parseOptionalDateInput(resolvedDateRange?.from, false) ?? undefined,
    toDate: parseOptionalDateInput(resolvedDateRange?.to, true) ?? undefined,
  }
}

export function withReportFilters(
  pathname: string,
  filters: { dateRange?: string[] | null }
) {
  const params = new URLSearchParams()

  if (filters.dateRange?.length) {
    params.set("dateRange", filters.dateRange.join(","))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
