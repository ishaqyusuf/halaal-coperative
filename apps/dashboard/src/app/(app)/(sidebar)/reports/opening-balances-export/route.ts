import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
} from "../export-utils"
import { buildOpeningBalancesExportCsv } from "@/lib/reports/client-fit-export-builders"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries()),
  )
  const status = searchParams.get("status") ?? undefined
  const memberId = searchParams.get("memberId") ?? undefined
  const csv = await buildOpeningBalancesExportCsv({
    filters,
    memberId,
    status,
    tenantId: context.tenant.id,
  })

  return createCsvResponse(
    `${context.tenant.slug}-opening-balances-report.csv`,
    csv,
  )
}
