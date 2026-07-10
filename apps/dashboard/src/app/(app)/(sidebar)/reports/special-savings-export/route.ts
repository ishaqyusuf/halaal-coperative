import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
} from "../export-utils"
import { buildSpecialSavingsExportCsv } from "@/lib/reports/client-fit-export-builders"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries()),
  )
  const memberId = searchParams.get("memberId") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const csv = await buildSpecialSavingsExportCsv({
    filters,
    memberId,
    search,
    tenantId: context.tenant.id,
  })

  return createCsvResponse(
    `${context.tenant.slug}-special-savings-report.csv`,
    csv,
  )
}
