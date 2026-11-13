import { describe, expect, test } from "bun:test"
import {
  buildContributionHealth,
  getCommitmentCollection,
} from "./contribution-health"

describe("contribution health", () => {
  test("a new cooperative with no commitments is not reported as covered", () => {
    const health = buildContributionHealth({
      commitments: { committedMembers: [], postedByMember: [] },
      monthlyRows: [],
      periodLabel: "November 2026",
    })

    expect(health).toEqual({
      basis: "active_commitments",
      collectionGap: 0,
      expectedThisMonth: 0,
      paidMemberCount: 0,
      periodLabel: "November 2026",
      receivedThisMonth: 0,
      state: "no_commitments",
      unpaidMemberCount: 0,
    })
  })

  test("estimates from active commitments and this month's posted contributions", () => {
    const health = buildContributionHealth({
      commitments: {
        committedMembers: [
          { amount: 25000, memberId: "member-1" },
          { amount: 10000, memberId: "member-2" },
          { amount: 5000, memberId: "member-3" },
        ],
        postedByMember: [
          { amount: 30000, memberId: "member-1" },
          // A member without a commitment who still paid counts as paid.
          { amount: 2000, memberId: "member-4" },
          { amount: 0, memberId: "member-2" },
        ],
      },
      monthlyRows: null,
      periodLabel: "November 2026",
    })

    expect(health).toMatchObject({
      basis: "active_commitments",
      collectionGap: 8000,
      expectedThisMonth: 40000,
      paidMemberCount: 2,
      receivedThisMonth: 32000,
      state: "gap",
      unpaidMemberCount: 2,
    })
  })

  test("uses the monthly record rows when they exist", () => {
    const health = buildContributionHealth({
      commitments: null,
      monthlyRows: [
        {
          calculatedPayableAmount: 25000,
          status: "applied",
          totalPaidAmount: 25000,
        },
        { calculatedPayableAmount: 10000, status: "draft", totalPaidAmount: 0 },
        {
          calculatedPayableAmount: 5000,
          status: "cancelled",
          totalPaidAmount: 0,
        },
      ],
      periodLabel: "November 2026",
    })

    expect(health).toMatchObject({
      basis: "monthly_record",
      collectionGap: 15000,
      expectedThisMonth: 40000,
      paidMemberCount: 1,
      receivedThisMonth: 25000,
      state: "gap",
      unpaidMemberCount: 1,
    })
  })

  test("reports covered only when something was expected and fully received", () => {
    const health = buildContributionHealth({
      commitments: {
        committedMembers: [{ amount: 25000, memberId: "member-1" }],
        postedByMember: [{ amount: 25000, memberId: "member-1" }],
      },
      monthlyRows: [],
      periodLabel: "November 2026",
    })

    expect(health.state).toBe("covered")
    expect(health.paidMemberCount).toBe(1)
    expect(health.unpaidMemberCount).toBe(0)
  })

  test("scopes commitment and contribution reads to the tenant and month", async () => {
    const observed: Record<string, any> = {}
    const collection = await getCommitmentCollection(
      "tenant-1",
      { month: 11, year: 2026 },
      {
        contribution: {
          groupBy: async (args: any) => {
            observed.contribution = args
            return [{ _sum: { amount: "30000" }, memberId: "member-1" }]
          },
        },
        contributionPlan: {
          findMany: async (args: any) => {
            observed.plans = args
            return [{ amount: "25000", memberId: "member-1" }]
          },
        },
      } as never
    )

    expect(collection).toEqual({
      committedMembers: [{ amount: 25000, memberId: "member-1" }],
      postedByMember: [{ amount: 30000, memberId: "member-1" }],
    })
    expect(observed.plans.where).toMatchObject({
      isActive: true,
      member: { status: "active" },
      startsAt: { lt: new Date("2026-12-01T00:00:00.000Z") },
      tenantId: "tenant-1",
    })
    expect(observed.contribution.where).toEqual({
      postedAt: {
        gte: new Date("2026-11-01T00:00:00.000Z"),
        lt: new Date("2026-12-01T00:00:00.000Z"),
      },
      status: "posted",
      tenantId: "tenant-1",
    })
  })
})
