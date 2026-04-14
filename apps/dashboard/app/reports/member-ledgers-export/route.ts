import { listLedgerTransactions } from "@halaal-vest/db"
import { createCsvResponse, getReportsDateFilters, requireReportsExportContext, toCsv } from "../export-utils"

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(Object.fromEntries(searchParams.entries()))
  const transactions = await listLedgerTransactions(context.tenant.id, {
    fromDate: filters.fromDate,
    limit: 500,
    toDate: filters.toDate,
  })

  const csv = toCsv(
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
      ]),
    ),
  )

  return createCsvResponse(`${context.tenant.slug}-member-ledgers-report.csv`, csv)
}
