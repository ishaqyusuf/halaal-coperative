import type { PrismaClient } from "../../generated/prisma/client"

/**
 * Read side of the cooperative opening cash (triage 1.9), kept apart from
 * the writer so deployable funds can read it without importing migration.
 */

export const OPENING_CASH_LEDGER_REFERENCE = "opening-cash"

type OpeningCashReadPrisma = Pick<PrismaClient, "ledgerEntry">

/** The recorded opening cash: net Cash / Bank (2000) on `opening-cash` postings. */
export async function getTenantOpeningCashAmount(
  tenantId: string,
  prisma: PrismaClient | OpeningCashReadPrisma
) {
  const client = prisma as OpeningCashReadPrisma

  if (typeof client.ledgerEntry?.groupBy !== "function") {
    return 0
  }

  const rows = await client.ledgerEntry.groupBy({
    _sum: { amount: true },
    by: ["direction"],
    where: {
      ledgerAccount: { code: "2000" },
      ledgerTransaction: { reference: OPENING_CASH_LEDGER_REFERENCE },
      tenantId,
    },
  })

  let amount = 0

  for (const row of rows) {
    const value = Number(row._sum?.amount ?? 0)
    amount += row.direction === "debit" ? value : -value
  }

  return Math.round(amount * 100) / 100
}
