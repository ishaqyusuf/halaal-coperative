import type { PrismaClient } from "../../generated/prisma/client"

/**
 * Home "Contribution health" for the current period.
 *
 * - `monthly_record`: the period's monthly record exists, so expected and paid
 *   figures come from its member rows.
 * - `active_commitments`: no monthly record yet. Expected is the sum of the
 *   active members' active commitment plans; received and paid members come
 *   from contributions posted this calendar month.
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

export type MonthlyRecordCollectionRow = {
  calculatedPayableAmount: unknown
  status: string
  totalPaidAmount: unknown
}

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
  monthlyRows: MonthlyRecordCollectionRow[] | null
  periodLabel: string
}): ContributionHealth {
  if (input.monthlyRows && input.monthlyRows.length > 0) {
    const rows = input.monthlyRows
    const expected = roundMoney(
      rows.reduce((total, row) => total + Number(row.calculatedPayableAmount), 0)
    )
    const received = roundMoney(
      rows.reduce((total, row) => total + Number(row.totalPaidAmount), 0)
    )

    return {
      basis: "monthly_record",
      collectionGap: Math.max(0, roundMoney(expected - received)),
      expectedThisMonth: expected,
      paidMemberCount: rows.filter(
        (row) => row.status === "applied" && Number(row.totalPaidAmount) > 0
      ).length,
      periodLabel: input.periodLabel,
      receivedThisMonth: received,
      state: resolveState(expected, received),
      unpaidMemberCount: rows.filter(
        (row) => row.status !== "cancelled" && Number(row.totalPaidAmount) <= 0
      ).length,
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
    periodLabel: input.periodLabel,
    receivedThisMonth: received,
    state: resolveState(expected, received),
    unpaidMemberCount: [...committed.keys()].filter(
      (memberId) => !payers.has(memberId)
    ).length,
  }
}

/**
 * Reads active commitments and this month's posted contributions. Only used
 * when the period has no monthly record. Missing delegates (narrow test
 * doubles) read as empty.
 */
export async function getCommitmentCollection(
  tenantId: string,
  period: { month: number; year: number },
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
