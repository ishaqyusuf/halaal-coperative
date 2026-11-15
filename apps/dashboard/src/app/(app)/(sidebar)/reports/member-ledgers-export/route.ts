import { listLedgerTransactions } from "@halaalvest/db"
import {
  createCsvStreamResponse,
  getReportsDateFilters,
  lastIdCursor,
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
  const batches = readExportBatches(async ({ cursor, limit }) => {
    const rows = await listLedgerTransactions(tenantId, {
      cursor,
      fromDate: filters.fromDate,
      limit,
      toDate: filters.toDate,
    })

    return { nextCursor: lastIdCursor(rows, limit), rows }
  })

  return createCsvStreamResponse(
    `${context.tenant.slug}-member-ledgers-report.csv`,
    [
      "Posted At",
      "Member",
      "Member Number",
      "Transaction Type",
      "Narration",
      "Reference",
      "Ledger Account",
      "Direction",
      "Amount",
    ],
    mapExportBatches(batches, (transactions) =>
      transactions.flatMap((transaction) =>
        transaction.entries.map((entry) => [
          transaction.postedAt.toISOString(),
          transaction.member?.fullName ?? "",
          transaction.member?.memberNumber ?? "",
          transaction.transactionType,
          transaction.narration ?? "",
          transaction.reference ?? "",
          entry.ledgerAccount.name,
          entry.direction,
          Number(entry.amount),
        ])
      )
    )
  )
}
