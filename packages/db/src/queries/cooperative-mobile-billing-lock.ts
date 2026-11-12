import type { Prisma } from "../../generated/prisma/client"

// An approval that crosses local midnight must commit before close reads its
// old month, or obtain the lock afterwards and use the new month.
export async function lockCooperativeMobileBilling(
  tx: Prisma.TransactionClient,
  tenantId: string
) {
  const key = `cooperative-mobile-billing:${tenantId}`
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
}
