import { Prisma, type PrismaClient } from "../../generated/prisma/client"

/**
 * Home "Contribution health" for the current period.
 *
 * - `monthly_record`: the selected record has member rows.
 * - `active_commitments`: the selected record is missing or empty. Expected
 *   comes from active members' active commitment plans; received and paid
 *   members come from contributions posted this calendar month.
 *
 * `state` is `no_commitments` whenever nothing is expected, so a brand-new
 * cooperative never reads "Covered" with ₦0 expected.
 */
export type ContributionHealthState = "no_commitments" | "covered" | "gap"
export type ContributionHealthBasis = "monthly_record" | "active_commitments"

export type ContributionHealth = {
  basis: ContributionHealthBasis
  collectionGap: number
  expectedThisMonth: number
  paidMemberCount: number
  periodLabel: string
  receivedThisMonth: number
  state: ContributionHealthState
  unpaidMemberCount: number
}

type MonthlyRecordCollection = {
  expectedAmount: Prisma.Decimal
  receivedAmount: Prisma.Decimal
  paidCount: bigint
  unpaidCount: bigint
  rowCount: bigint
  periodLabel: string
}

type ContributionPeriod = { month: number; year: number }

export type CommitmentCollection = {
  /** Member ids with an active commitment plan this period. */
  committedMembers: Array<{ amount: number; memberId: string }>
  /** Contributions posted this period, per member. */
  postedByMember: Array<{ amount: number; memberId: string }>
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function resolveState(expected: number, received: number) {
  if (expected <= 0) return "no_commitments" as const
  return received >= expected ? ("covered" as const) : ("gap" as const)
}

export function buildContributionHealth(input: {
  commitments: CommitmentCollection | null
  monthlyCollection: MonthlyRecordCollection | null
  periodLabel: string
}): ContributionHealth {
  const monthly = input.monthlyCollection
  if (monthly && monthly.rowCount > 0n) {
    const gap = monthly.expectedAmount.minus(monthly.receivedAmount)

    return {
      basis: "monthly_record",
      collectionGap: Math.max(0, gap.toNumber()),
      expectedThisMonth: monthly.expectedAmount.toNumber(),
      paidMemberCount: Number(monthly.paidCount),
      periodLabel: monthly.periodLabel,
      receivedThisMonth: monthly.receivedAmount.toNumber(),
      state: monthly.expectedAmount.lte(0)
        ? "no_commitments"
        : gap.gt(0)
          ? "gap"
          : "covered",
      unpaidMemberCount: Number(monthly.unpaidCount),
    }
  }

  const committed = new Map<string, number>()
  for (const plan of input.commitments?.committedMembers ?? []) {
    committed.set(
      plan.memberId,
      (committed.get(plan.memberId) ?? 0) + Number(plan.amount)
    )
  }
  const payers = new Map<string, number>()
  for (const posted of input.commitments?.postedByMember ?? []) {
    if (Number(posted.amount) > 0) {
      payers.set(
        posted.memberId,
        (payers.get(posted.memberId) ?? 0) + Number(posted.amount)
      )
    }
  }

  const expected = roundMoney(
    [...committed.values()].reduce((total, amount) => total + amount, 0)
  )
  const received = roundMoney(
    [...payers.values()].reduce((total, amount) => total + amount, 0)
  )

  return {
    basis: "active_commitments",
    collectionGap: Math.max(0, roundMoney(expected - received)),
    expectedThisMonth: expected,
    paidMemberCount: payers.size,
    periodLabel: monthly?.periodLabel ?? input.periodLabel,
    receivedThisMonth: received,
    state: resolveState(expected, received),
    unpaidMemberCount: [...committed.keys()].filter(
      (memberId) => !payers.has(memberId)
    ).length,
  }
}

export async function readMonthlyRecordCollection(
  tenantId: string,
  { month, year }: ContributionPeriod,
  prisma: PrismaClient
): Promise<MonthlyRecordCollection | null> {
  if (typeof prisma.$queryRaw !== "function") {
    // Match the SQL read for delegate-only test clients.
    const record =
      (await prisma.monthlyRecord.findFirst({
        select: { id: true, periodLabel: true },
        where: { tenantId, periodMonth: month, periodYear: year },
      })) ??
      (await prisma.monthlyRecord.findFirst({
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        select: { id: true, periodLabel: true },
        where: { tenantId, status: { in: ["draft", "open"] } },
      }))
    if (!record) return null

    const rows = await prisma.monthlyRecordMember.findMany({
      select: {
        calculatedPayableAmount: true,
        status: true,
        totalPaidAmount: true,
      },
      where: { monthlyRecordId: record.id, tenantId },
    })
    const collection: MonthlyRecordCollection = {
      expectedAmount: new Prisma.Decimal(0),
      receivedAmount: new Prisma.Decimal(0),
      paidCount: 0n,
      unpaidCount: 0n,
      rowCount: BigInt(rows.length),
      periodLabel: record.periodLabel,
    }
    for (const row of rows) {
      collection.expectedAmount = collection.expectedAmount.plus(
        row.calculatedPayableAmount
      )
      collection.receivedAmount = collection.receivedAmount.plus(
        row.totalPaidAmount
      )
      if (row.status === "applied" && row.totalPaidAmount.gt(0))
        collection.paidCount++
      if (row.status !== "cancelled" && row.totalPaidAmount.lte(0))
        collection.unpaidCount++
    }
    return collection
  }

  const [collection] = await prisma.$queryRaw<MonthlyRecordCollection[]>`
    SELECT record.period_label AS "periodLabel", collection.*
    FROM monthly_records record
    CROSS JOIN LATERAL (
      SELECT
        count(*) AS "rowCount",
        coalesce(sum(member.calculated_payable_amount), 0) AS "expectedAmount",
        coalesce(sum(member.total_paid_amount), 0) AS "receivedAmount",
        count(*) FILTER (
          WHERE member.status = 'applied' AND member.total_paid_amount > 0
        ) AS "paidCount",
        count(*) FILTER (
          WHERE member.status <> 'cancelled' AND member.total_paid_amount <= 0
        ) AS "unpaidCount"
      FROM monthly_record_members member
      WHERE member.monthly_record_id = record.id
        AND member.tenant_id = ${tenantId}::uuid
    ) collection
    WHERE record.tenant_id = ${tenantId}::uuid
      AND record.id = coalesce(
        (
          SELECT id FROM monthly_records
          WHERE tenant_id = ${tenantId}::uuid
            AND period_year = ${year} AND period_month = ${month}
        ),
        (
          SELECT id FROM monthly_records
          WHERE tenant_id = ${tenantId}::uuid AND status IN ('draft', 'open')
          ORDER BY period_year DESC, period_month DESC
          LIMIT 1
        )
      )
  `
  return collection ?? null
}

/**
 * Reads active commitments and this month's posted contributions. Only used
 * when the selected record is missing or empty. Missing delegates (narrow test
 * doubles) read as empty.
 */
export async function getCommitmentCollection(
  tenantId: string,
  period: ContributionPeriod,
  prismaOverride: PrismaClient
): Promise<CommitmentCollection> {
  const prisma = prismaOverride as any
  const monthStart = new Date(Date.UTC(period.year, period.month - 1, 1))
  const nextMonthStart = new Date(Date.UTC(period.year, period.month, 1))

  const [plans, posted] = await Promise.all([
    typeof prisma.contributionPlan?.findMany === "function"
      ? prisma.contributionPlan.findMany({
          select: { amount: true, memberId: true },
          where: {
            isActive: true,
            member: { status: "active" },
            startsAt: { lt: nextMonthStart },
            OR: [{ endsAt: null }, { endsAt: { gte: monthStart } }],
            tenantId,
          },
        })
      : [],
    typeof prisma.contribution?.groupBy === "function"
      ? prisma.contribution.groupBy({
          by: ["memberId"],
          _sum: { amount: true },
          where: {
            postedAt: { gte: monthStart, lt: nextMonthStart },
            status: "posted",
            tenantId,
          },
        })
      : [],
  ])

  return {
    committedMembers: plans.map(
      (plan: { amount: unknown; memberId: string }) => ({
        amount: Number(plan.amount ?? 0),
        memberId: plan.memberId,
      })
    ),
    postedByMember: posted.map(
      (row: { _sum: { amount: unknown }; memberId: string }) => ({
        amount: Number(row._sum.amount ?? 0),
        memberId: row.memberId,
      })
    ),
  }
}
