import { describe, expect, test } from "bun:test"
import { setMemberContributionPlan } from "./contributions"
import { previewMonthlyFinancingCycle } from "./financing-cycles"
import {
  anchorSetupCommitmentsToGoLive,
  getCommitmentMonthStart,
} from "./setup-commitments"

type Plan = {
  amount: number
  endsAt: Date | null
  id: string
  isActive: boolean
  memberId: string
  name: string
  startsAt: Date
  startsAtGoLive: boolean
  tenantId: string
}

const tenantId = "tenant-1"
const memberId = "member-1"

function matches(plan: Plan, where: Record<string, any> = {}) {
  for (const [key, value] of Object.entries(where)) {
    const actual = (plan as Record<string, any>)[key]

    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("lt" in value && !(actual < value.lt)) return false
      if ("not" in value && actual === value.not) return false
      continue
    }

    if (value instanceof Date || actual instanceof Date) {
      if (actual?.getTime?.() !== value?.getTime?.()) return false
      continue
    }

    if (actual !== value) return false
  }

  return true
}

/** An in-memory stand-in for the tables a commitment save touches. */
function createCommitmentStore(input: {
  plans?: Plan[]
  status: "historical_setup_in_progress" | "live_operations"
}) {
  const plans: Plan[] = [...(input.plans ?? [])]
  const audits: Array<{ data: Record<string, unknown> }> = []
  let nextId = plans.length + 1

  const contributionPlan = {
    create: async ({ data }: { data: Omit<Plan, "endsAt" | "id"> }) => {
      const plan: Plan = {
        endsAt: null,
        id: `plan-${nextId++}`,
        ...data,
        startsAtGoLive: data.startsAtGoLive ?? false,
      }
      plans.push(plan)
      return plan
    },
    findFirst: async ({
      where,
      orderBy,
    }: {
      orderBy?: { startsAt: "desc" }
      where: Record<string, any>
    }) => {
      const found = plans.filter((plan) => matches(plan, where))
      if (orderBy) {
        found.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      }
      return found[0] ?? null
    },
    findMany: async ({ where }: { where: Record<string, any> }) =>
      plans.filter((plan) => matches(plan, where)),
    update: async ({
      data,
      where,
    }: {
      data: Partial<Plan>
      where: { id: string }
    }) => {
      const plan = plans.find((row) => row.id === where.id)
      if (!plan) throw new Error("missing plan")
      Object.assign(plan, data)
      return plan
    },
    updateMany: async ({
      data,
      where,
    }: {
      data: Partial<Plan>
      where: Record<string, any>
    }) => {
      const found = plans.filter((plan) => matches(plan, where))
      for (const plan of found) Object.assign(plan, data)
      return { count: found.length }
    },
  }
  const client: any = {
    auditLog: {
      create: async (args: { data: Record<string, unknown> }) => {
        audits.push(args)
        return args.data
      },
    },
    contributionPlan,
    loan: { count: async () => 0 },
    member: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        where.id === memberId
          ? {
              _count: { contributionPlans: plans.length },
              id: memberId,
              joinedAt: new Date("2024-03-01T00:00:00.000Z"),
            }
          : null,
    },
    tenant: {
      findUnique: async () => ({
        initialMigrationStatus: input.status,
        migrationEmergencyUnlockUntil: null,
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({ strictCommitmentDuringFinancing: false }),
    },
  }
  client.$transaction = async (callback: (tx: unknown) => unknown) =>
    callback(client)

  return { audits, client, plans }
}

describe("monthly commitments entered during setup (triage 1.8)", () => {
  test("a setup commitment starts this month and is marked for go-live", async () => {
    const store = createCommitmentStore({
      status: "historical_setup_in_progress",
    })

    await setMemberContributionPlan(
      {
        actorUserId: "owner-1",
        amount: 20000,
        memberId,
        // The date picked in the form is ignored before go-live.
        startsAt: new Date("2024-03-01T00:00:00.000Z"),
        tenantId,
      },
      store.client
    )

    expect(store.plans).toHaveLength(1)
    expect(store.plans[0]).toMatchObject({
      amount: 20000,
      isActive: true,
      startsAtGoLive: true,
    })
    expect(store.plans[0]?.startsAt.getTime()).toBe(
      getCommitmentMonthStart(new Date()).getTime()
    )
    expect(store.audits[0]?.data).toMatchObject({
      action: "contribution_plan.set",
      metadata: { startsAtGoLive: true },
    })
  })

  test("saving again during setup changes the amount in place", async () => {
    const store = createCommitmentStore({
      status: "historical_setup_in_progress",
    })
    const save = (amount: number) =>
      setMemberContributionPlan(
        {
          actorUserId: "owner-1",
          amount,
          memberId,
          startsAt: new Date(),
          tenantId,
        },
        store.client
      )

    await save(20000)
    await save(25000)

    expect(store.plans).toHaveLength(1)
    expect(store.plans[0]).toMatchObject({ amount: 25000, isActive: true })
  })

  test("a setup commitment ends the dated history entered with the member", async () => {
    const store = createCommitmentStore({
      plans: [
        {
          amount: 10000,
          endsAt: null,
          id: "plan-history",
          isActive: true,
          memberId,
          name: "Monthly commitment",
          startsAt: new Date("2024-03-01T00:00:00.000Z"),
          startsAtGoLive: false,
          tenantId,
        },
      ],
      status: "historical_setup_in_progress",
    })

    await setMemberContributionPlan(
      {
        actorUserId: "owner-1",
        amount: 15000,
        memberId,
        startsAt: new Date(),
        tenantId,
      },
      store.client
    )

    const [history, setup] = store.plans
    expect(history).toMatchObject({ isActive: false })
    expect(history?.endsAt?.getTime()).toBe(setup?.startsAt.getTime())
    expect(setup).toMatchObject({ isActive: true, startsAtGoLive: true })
  })

  test("a setup commitment must be more than ₦0", async () => {
    const store = createCommitmentStore({
      status: "historical_setup_in_progress",
    })

    await expect(
      setMemberContributionPlan(
        {
          actorUserId: "owner-1",
          amount: 0,
          memberId,
          startsAt: new Date(),
          tenantId,
        },
        store.client
      )
    ).rejects.toThrow("more than ₦0")
    expect(store.plans).toHaveLength(0)
  })

  test("after go-live a commitment is dated as chosen, with no go-live mark", async () => {
    const store = createCommitmentStore({ status: "live_operations" })

    await setMemberContributionPlan(
      {
        actorUserId: "owner-1",
        amount: 20000,
        memberId,
        startsAt: new Date("2024-03-01T00:00:00.000Z"),
        tenantId,
      },
      store.client
    )

    expect(store.plans[0]).toMatchObject({ startsAtGoLive: false })
    expect(store.plans[0]?.startsAt.toISOString()).toBe(
      "2024-03-01T00:00:00.000Z"
    )
  })

  test("going live moves setup commitments to the go-live month, and nothing earlier is due", async () => {
    const enteredMonth = new Date("2026-09-01T00:00:00.000Z")
    const store = createCommitmentStore({
      plans: [
        {
          amount: 10000,
          endsAt: enteredMonth,
          id: "plan-history",
          isActive: false,
          memberId,
          name: "Monthly commitment",
          startsAt: new Date("2024-03-01T00:00:00.000Z"),
          startsAtGoLive: false,
          tenantId,
        },
        {
          amount: 20000,
          endsAt: null,
          id: "plan-setup",
          isActive: true,
          memberId,
          name: "Monthly commitment",
          startsAt: enteredMonth,
          startsAtGoLive: true,
          tenantId,
        },
      ],
      status: "historical_setup_in_progress",
    })
    const goLiveAt = new Date("2026-11-16T10:30:00.000Z")

    expect(
      await anchorSetupCommitmentsToGoLive(
        { goLiveAt, tenantId },
        store.client
      )
    ).toEqual({ movedPlanCount: 1 })

    const goLiveMonth = "2026-11-01T00:00:00.000Z"
    expect(store.plans[1]?.startsAt.toISOString()).toBe(goLiveMonth)
    expect(store.plans[0]?.endsAt?.toISOString()).toBe(goLiveMonth)

    // Running it again changes nothing.
    expect(
      await anchorSetupCommitmentsToGoLive(
        { goLiveAt, tenantId },
        store.client
      )
    ).toEqual({ movedPlanCount: 0 })
  })

  test("a setup commitment counts towards the go-live month's lending capacity only", async () => {
    const aggregates: Array<Record<string, any>> = []
    const setupPlan = {
      isActive: true,
      startsAt: new Date("2026-11-01T00:00:00.000Z"),
    }
    const prisma: any = {
      contribution: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      contributionPlan: {
        aggregate: async (args: { where: Record<string, any> }) => {
          aggregates.push(args.where)
          return {
            _sum: {
              amount: setupPlan.startsAt < args.where.startsAt.lt ? 20000 : 0,
            },
          }
        },
      },
      financingCycle: { findUnique: async () => null },
      loan: {
        aggregate: async () => ({ _sum: {} }),
        findMany: async () => [],
      },
      loanRequest: {
        aggregate: async () => ({ _sum: {} }),
        findMany: async () => [],
      },
      tenantPolicy: {
        findUnique: async () => ({
          normalAllocationPercentage: 70,
          quickAllocationPercentage: 30,
          reserveBufferAmount: 0,
        }),
      },
    }

    const october = await previewMonthlyFinancingCycle(
      { periodStart: new Date("2026-10-01T00:00:00.000Z"), tenantId },
      prisma
    )
    const november = await previewMonthlyFinancingCycle(
      { periodStart: new Date("2026-11-01T00:00:00.000Z"), tenantId },
      prisma
    )

    expect(october.projectedCommitmentAmount).toBe(0)
    expect(november.projectedCommitmentAmount).toBe(20000)
  })
})
