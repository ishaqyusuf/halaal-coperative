import { resolveDateFilter } from "@halaalvest/utils"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
export { toCsv } from "@/lib/reports/csv"

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
