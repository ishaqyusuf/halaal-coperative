import type { PrismaClient } from "../../generated/prisma/client"

// A member's monthly payment can be posted from two places: the monthly record
// (single "Mark paid" or workplace bulk receiving) and a workplace batch on the
// contributions page. Each path must see the other's posting for the same
// month inside its own transaction, or a member is paid twice.
//
// Both paths lock the member rows first (sorted, so concurrent runs take them
// in the same order), then check the other path. Under READ COMMITTED a second
// transaction waits on the lock and then reads the first one's committed
// posting.

export async function lockMembersForMonthlyPayment(
  tx: PrismaClient,
  input: { memberIds: string[]; tenantId: string }
) {
  const memberIds = [...new Set(input.memberIds)].sort()
  if (memberIds.length === 0) return

  await tx.$queryRaw`
    SELECT id FROM members
    WHERE tenant_id = ${input.tenantId}::uuid
      AND id = ANY(${memberIds}::uuid[])
    ORDER BY id
    FOR UPDATE`
}

type PeriodInput = {
  memberIds: string[]
  periodMonth: number
  periodYear: number
  tenantId: string
}

// Members whose monthly-record row for the month is applied (paid).
export async function findMembersPaidByMonthlyRecord(
  tx: PrismaClient,
  input: PeriodInput
) {
  if (input.memberIds.length === 0) return new Set<string>()

  const rows = await tx.monthlyRecordMember.findMany({
    where: {
      memberId: { in: input.memberIds },
      monthlyRecord: {
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
      },
      status: "applied",
      tenantId: input.tenantId,
    },
    select: { memberId: true },
  })

  return new Set(rows.map((row) => row.memberId))
}

// Members with a workplace batch row for the month whose contribution still
// stands. A reversed contribution (monthly-record undo) does not count.
export async function findMembersPaidByWorkplaceBatch(
  tx: PrismaClient,
  input: PeriodInput
) {
  if (input.memberIds.length === 0) return new Set<string>()

  const rows = await tx.collectionSourceContributionBatchRow.findMany({
    where: {
      batch: {
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
      },
      contribution: { status: { not: "reversed" } },
      memberId: { in: input.memberIds },
      tenantId: input.tenantId,
    },
    select: { memberId: true },
  })

  return new Set(rows.map((row) => row.memberId))
}
