import { listChargeApplications } from "@halaalvest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const charges = await listChargeApplications(context.tenant.id, {
    fromDate: filters.fromDate,
    limit: 500,
    toDate: filters.toDate,
  })

  const csv = toCsv(
    [
      "Assessed At",
      "Member",
      "Member Number",
      "Charge",
      "Code",
      "Amount",
      "Status",
      "Notes",
    ],
    charges.map((charge) => [
      charge.assessedAt.toISOString(),
      charge.member.fullName,
      charge.member.memberNumber,
      charge.chargeDefinition.name,
      charge.chargeDefinition.code,
      Number(charge.amount),
      charge.status,
      charge.notes ?? "",
    ]),
  )

  return createCsvResponse(`${context.tenant.slug}-charges-report.csv`, csv)
}
