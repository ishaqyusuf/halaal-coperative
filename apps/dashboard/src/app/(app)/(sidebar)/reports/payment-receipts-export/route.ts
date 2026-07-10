import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
} from "../export-utils"
import { buildPaymentReceiptsExportCsv } from "@/lib/reports/client-fit-export-builders"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries())
  )
  const csv = await buildPaymentReceiptsExportCsv(context.tenant.id, filters)

  return createCsvResponse(`${context.tenant.slug}-payment-receipts.csv`, csv)
}
