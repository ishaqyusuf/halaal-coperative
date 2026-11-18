import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { createPrismaClient } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `fin-settings-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Person = { membershipId: string; tenantId: string; userId: string }

runIntegration("finance setup actions", () => {
  let tenantId = ""
  let admin: Person
  let member: Person

  async function addPerson(role: "member" | "tenant_admin"): Promise<Person> {
    if (!prisma) throw new Error("Database integration test not configured.")

    const user = await prisma.user.create({
      data: {
        email: `${slug}-${role}@example.test`,
        fullName: `Finance ${role}`,
        tenantId,
      },
    })
    const membership = await prisma.membership.create({
      data: { isDefault: true, role, tenantId, userId: user.id },
    })

    return { membershipId: membership.id, tenantId, userId: user.id }
  }

  async function callerFor(person: Person) {
    const token = await createSignedSessionToken({
      membershipId: person.membershipId,
      scope: platformSessionScope,
      tenantId: person.tenantId,
      userId: person.userId,
    })

    return createCaller(
      await buildRequestContext(
        new Headers({
          authorization: `Bearer ${token}`,
          host: "api.halaalvest.localhost",
        })
      )
    )
  }

  async function readPolicy() {
    if (!prisma) throw new Error("Database integration test not configured.")

    return prisma.tenantPolicy.findUniqueOrThrow({
      select: {
        reserveBufferAmount: true,
        shareConfigurationMode: true,
        shareUnitAmount: true,
      },
      where: { tenantId },
    })
  }

  beforeAll(async () => {
    if (!prisma) return

    const tenant = await prisma.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date(),
        name: "Finance Settings Cooperative",
        slug,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    await prisma.tenantPolicy.create({
      data: {
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        reserveBufferAmount: 1000,
        shareConfigurationMode: "unit_based",
        shareUnitAmount: 10000,
        tenantId,
      },
    })
    admin = await addPerson("tenant_admin")
    member = await addPerson("member")
  })

  afterAll(async () => {
    if (!prisma) return
    if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } })
    await prisma.$disconnect()
  })

  test.each([
    ["updateTenantFinancingPolicyAction", [["reserveBufferAmount", "0"]]],
    ["updateTenantSharePolicyAction", [["configurationMode", "unit_based"]]],
    [
      "updateTenantBusinessProfitPolicyAction",
      [["profitDistributionFrequency", "annual"]],
    ],
    ["updateLoanProductSettingsAction", [["loanType", "quick"]]],
    ["openMonthlyFinancingCycleAction", []],
    ["updateTenantFinanceStartDateAction", [["startDate", "2024-01-01"]]],
    ["setTenantOpeningCashAction", [["amount", "5000"]]],
  ] as Array<[string, Array<[string, string]>]>)(
    "a member can't run %s",
    async (action, fields) => {
      const caller = await callerFor(member)
      const run = (
        caller.dashboardActions as unknown as Record<
          string,
          (input: { fields: Array<[string, string]> }) => Promise<unknown>
        >
      )[action]

      if (!run) throw new Error(`Missing action ${action}`)
      await expect(run({ fields })).rejects.toThrow()
      expect((await readPolicy()).reserveBufferAmount.toString()).toBe("1000")
    }
  )

  test("a live cooperative can't switch the share model", async () => {
    const caller = await callerFor(admin)

    await expect(
      caller.dashboardActions.updateTenantSharePolicyAction({
        fields: [["configurationMode", "monthly_history"]],
      })
    ).rejects.toThrow("The share model can't change")
    expect((await readPolicy()).shareConfigurationMode).toBe("unit_based")
  })

  test("a live cooperative can still change the unit price", async () => {
    const caller = await callerFor(admin)

    await caller.dashboardActions.updateTenantSharePolicyAction({
      fields: [
        ["configurationMode", "unit_based"],
        ["unitAmount", "12500"],
        ["compulsoryShareUnits", "1"],
        ["maximumShareUnits", "20"],
      ],
    })
    expect(Number((await readPolicy()).shareUnitAmount)).toBe(12500)
  })

  test("the start date is locked once live", async () => {
    const caller = await callerFor(admin)

    await expect(
      caller.dashboardActions.updateTenantFinanceStartDateAction({
        fields: [["startDate", "2024-01-01"]],
      })
    ).rejects.toThrow("Initial migration tools are locked")
  })

  test("opening cash can't change once live", async () => {
    if (!prisma) throw new Error("Database integration test not configured.")
    const caller = await callerFor(admin)

    await expect(
      caller.dashboardActions.setTenantOpeningCashAction({
        fields: [["amount", "5000"]],
      })
    ).rejects.toThrow("Opening cash can't change after")
    expect(
      await prisma.ledgerTransaction.count({
        where: { reference: "opening-cash", tenantId },
      })
    ).toBe(0)
  })
})
