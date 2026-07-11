import { listChargeApplications } from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
} from "../export-utils"

function formatChargeSource(
  charge: Awaited<ReturnType<typeof listChargeApplications>>[number]
) {
  if (charge.procurementRequest) {
    return `Procurement: ${charge.procurementRequest.itemName}`
  }

  if (charge.foodPurchaseApplication) {
    return "Foodstuff Purchase"
  }

  if (charge.projectFinancingRequest) {
    return `Project Financing: ${charge.projectFinancingRequest.businessName}`
  }

  if (charge.loanRequest) {
    return "Loan request"
  }

  return (
    charge.chargeApplicability?.workflow?.replace(/_/g, " ") ?? "Manual charge"
  )
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
      "Collection Mode",
      "Source",
      "Notes",
    ],
    charges.map((charge: any) => [
      charge.assessedAt.toISOString(),
      charge.member.fullName,
      charge.member.memberNumber,
      charge.chargeDefinition.name,
      charge.chargeDefinition.code,
      Number(charge.amount),
      charge.status,
      charge.collectionMode,
      formatChargeSource(charge),
      charge.notes ?? "",
    ])
  )

  return createCsvResponse(`${context.tenant.slug}-charges-report.csv`, csv)
}
