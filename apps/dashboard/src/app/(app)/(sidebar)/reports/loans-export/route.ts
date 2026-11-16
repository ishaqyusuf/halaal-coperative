import { listLoanExportBatch } from "@halaalvest/db"
import {
  describeLoansExportDates,
  LOANS_EXPORT_HEADERS,
  toLoansExportCsvRow,
} from "@/lib/reports/loans-export"
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
  const tenantId = context.tenant.id
  const batches = readExportBatches(({ cursor, limit }) =>
    listLoanExportBatch(tenantId, {
      cursor,
      fromDate: filters.fromDate,
      limit,
      toDate: filters.toDate,
    })
  )

  return createCsvStreamResponse(
    `${context.tenant.slug}-loans-report.csv`,
    LOANS_EXPORT_HEADERS,
    mapExportBatches(batches, (rows) => rows.map(toLoansExportCsvRow)),
    [[describeLoansExportDates(filters)]]
  )
}
