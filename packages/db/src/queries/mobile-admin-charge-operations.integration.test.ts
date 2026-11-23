import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import { systemBillingChargeCodes } from "./cooperative-mobile-billing-constants"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  applyMobileAdminCharge,
  getMobileAdminChargeMembers,
  getMobileAdminChargePage,
  getMobileAdminChargeRulesForApply,
  getMobileAdminChargeSummary,
  getMobileAdminChargeWorkspace,
} from "./mobile-admin-charge-operations"

const url = process.env.HALAALVEST_DATABASE_URL
const localDatabase =
  url && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
let statements = 0
let simulatedLatency = false

class MeteredAdapter extends PrismaPg {
  override async connect() {
    const adapter = await super.connect()
    const queryRaw = adapter.queryRaw.bind(adapter)
    adapter.queryRaw = async (query) => {
      statements += 1
      if (simulatedLatency) await Bun.sleep(5)
      return queryRaw(query)
    }
    return adapter
  }
}

const db =
  localDatabase && url
    ? new PrismaClient({
        adapter: new MeteredAdapter({
          connectionString: normalizePostgresConnectionString(url),
        }),
      })
    : null
const capabilities = { view: true, manage: true, correct: true }
const now = new Date()
const earlier = new Date(now.getTime() - 90 * 86_400_000)
const tenantIds: string[] = []
let tenantId: string
let distantMemberId: string

describe.skipIf(!db)("mobile admin charges with Postgres", () => {
  beforeAll(async () => {
    const seed = async (name: string) => {
      const tenant = await db!.tenant.create({
        data: {
          name,
          slug: `t17-charge-${crypto.randomUUID()}`,
          currencyCode: "NGN",
        },
      })
      tenantIds.push(tenant.id)
      return tenant.id
    }

    tenantId = await seed("Cooperative A")
    const otherTenant = await seed("Cooperative B")
    const members = await db!.member.createManyAndReturn({
      data: Array.from({ length: 43 }, (_, index) => ({
        fullName:
          index > 40
            ? "Zainab Target"
            : `Aisha ${String(index).padStart(2, "0")}`,
        joinedAt: earlier,
        memberNumber: `QHC-${String(index).padStart(4, "0")}`,
        memberType: "individual",
        status: index === 42 ? "exited" : "active",
        tenantId,
      })),
    })
    distantMemberId = members.find(
      (member) => member.memberNumber === "QHC-0041"
    )!.id
    const otherMember = await db!.member.create({
      data: {
        fullName: "Zainab Target",
        joinedAt: earlier,
        memberNumber: "QHC-0041",
        memberType: "individual",
        tenantId: otherTenant,
      },
    })
    const definitions = await db!.chargeDefinition.createManyAndReturn({
      data: Array.from({ length: 33 }, (_, index) => ({
        amount: 5000,
        code: `T17-${String(index).padStart(2, "0")}`,
        kind: "fixed",
        name: "Fixture rule",
        tenantId,
      })),
    })
    const rule = definitions[0]!
    const levy = await db!.chargeDefinition.create({
      data: {
        amount: 5000,
        code: "T17-LEVY",
        isMonthlyLevy: true,
        kind: "fixed",
        name: "Monthly levy",
        tenantId,
      },
    })
    const systemRule = await db!.chargeDefinition.create({
      data: {
        amount: 9999,
        code: systemBillingChargeCodes[0]!,
        kind: "fixed",
        name: "System charge",
        tenantId,
      },
    })
    const otherRule = await db!.chargeDefinition.create({
      data: {
        amount: 9000,
        code: "T17-OTHER",
        kind: "fixed",
        name: "Other rule",
        tenantId: otherTenant,
      },
    })
    const applicability = await db!.chargeApplicability.create({
      data: {
        chargeDefinitionId: rule.id,
        collectionMode: "pay_separately",
        tenantId,
        trigger: "manual",
        workflow: "loan_request",
      },
    })
    await db!.chargeDefinitionVersion.createMany({
      data: [
        { effectiveFrom: earlier, amount: 5000 },
        { effectiveFrom: new Date(now.getTime() + 86_400_000), amount: 7000 },
      ].map(({ effectiveFrom, amount }) => ({
        effectiveFrom,
        amount,
        chargeDefinitionId: rule.id,
        kind: "fixed",
        tenantId,
      })),
    })
    await db!.chargeApplication.createMany({
      data: [
        ...Array.from({ length: 32 }, (_, index) => ({
          amount: 100,
          assessedAt: now,
          chargeApplicabilityId: applicability.id,
          chargeDefinitionId: rule.id,
          memberId: members[index]!.id,
          status:
            index === 0
              ? ("pending" as const)
              : index === 1
                ? ("waived" as const)
                : ("posted" as const),
          tenantId,
        })),
        {
          amount: 5000,
          assessedAt: now,
          chargeDefinitionId: levy.id,
          memberId: distantMemberId,
          status: "pending",
          tenantId,
        },
        {
          amount: 9999,
          assessedAt: now,
          chargeDefinitionId: systemRule.id,
          memberId: distantMemberId,
          status: "pending",
          tenantId,
        },
        {
          amount: 9000,
          assessedAt: now,
          chargeDefinitionId: otherRule.id,
          memberId: otherMember.id,
          status: "pending",
          tenantId: otherTenant,
        },
      ],
    })
  })

  afterAll(async () => {
    if (!db) return
    // Applications restrict definition deletion, so remove only our own charge fixtures first.
    await db.chargeApplication.deleteMany({
      where: { tenantId: { in: tenantIds } },
    })
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    await db.$disconnect()
  })

  test("searches every eligible member and pages stably within the cooperative", async () => {
    const first = await getMobileAdminChargeMembers({ tenantId }, db!)
    const next = await getMobileAdminChargeMembers(
      { cursor: first.nextCursor, tenantId },
      db!
    )
    expect(first.data).toHaveLength(30)
    expect(next.data).toHaveLength(12)
    expect(next.nextCursor).toBeNull()
    expect(
      new Set([...first.data, ...next.data].map((member) => member.id)).size
    ).toBe(42)
    for (const search of ["zainab target", "qhc-0041"]) {
      const result = await getMobileAdminChargeMembers(
        { search, tenantId },
        db!
      )
      expect(result.data.map((member) => member.id)).toEqual([distantMemberId])
    }
  })

  test("pages independent lanes and resolves the assessed-date rate", async () => {
    const summary = await getMobileAdminChargeSummary(
      { tenantId, capabilities },
      db!
    )
    expect(summary.stats).toEqual({
      corrections: 1,
      outstanding: 5100,
      postedThisMonth: 3000,
    })
    const first = await getMobileAdminChargePage(
      { lane: "applications", tenantId },
      db!
    )
    const next = await getMobileAdminChargePage(
      { lane: "applications", cursor: first.nextCursor, tenantId },
      db!
    )
    expect(first.data).toHaveLength(30)
    expect(next.data).toHaveLength(2)
    expect(next.nextCursor).toBeNull()
    expect(
      new Set([...first.data, ...next.data].map((item) => item.id)).size
    ).toBe(32)
    const levies = await getMobileAdminChargePage(
      { lane: "levies", tenantId },
      db!
    )
    expect(
      levies.data.map((item) => "definitionCode" in item && item.definitionCode)
    ).toEqual(["T17-LEVY"])
    const rules = await getMobileAdminChargePage(
      { lane: "rules", tenantId },
      db!
    )
    const rest = await getMobileAdminChargePage(
      { lane: "rules", cursor: rules.nextCursor, tenantId },
      db!
    )
    expect(rules.data).toHaveLength(30)
    expect(rest.data).toHaveLength(4)
    const picker = await getMobileAdminChargeRulesForApply(
      { assessedAt: now, search: "fixture", tenantId },
      db!
    )
    expect(picker.data.map((item) => item.rate)).toEqual([5000])
  })

  test("counts SQL at a simulated 5 ms per query (five warm runs per path)", async () => {
    const input = { capabilities, lane: "applications" as const, tenantId }
    const summary = () => getMobileAdminChargeSummary(input, db!)
    const page = () => getMobileAdminChargePage(input, db!)
    const baseline = () => getMobileAdminChargeWorkspace(input, db!)
    const cases = [
      { name: "previous workspace", count: 13, run: baseline },
      {
        name: "initial summary + lane",
        count: 5,
        run: () => Promise.all([summary(), page()]),
      },
      { name: "lane alone", count: 4, run: page },
      {
        name: "member search",
        count: 1,
        run: () =>
          getMobileAdminChargeMembers({ search: "zainab", tenantId }, db!),
      },
      {
        name: "dated rule search",
        count: 1,
        run: () =>
          getMobileAdminChargeRulesForApply(
            { assessedAt: now, search: "fixture", tenantId },
            db!
          ),
      },
    ]
    const timings: string[] = []
    simulatedLatency = true
    try {
      for (const { name, count, run } of cases) {
        await run()
        const elapsed = []
        for (let index = 0; index < 5; index += 1) {
          statements = 0
          const start = performance.now()
          await run()
          elapsed.push(performance.now() - start)
          expect(statements).toBe(count)
        }
        timings.push(
          `${name}: ${count} SQL / ${elapsed.sort((a, b) => a - b)[2]!.toFixed(1)} ms`
        )
      }
    } finally {
      simulatedLatency = false
    }
    console.log(`T17 (+5 ms/query) ${timings.join(" | ")}`)
  })

  test("offers and posts standalone fixed charges at their effective rate", async () => {
    const later = new Date(now.getTime() + 86_400_000)
    const percentageFrom = new Date(now.getTime() + 2 * 86_400_000)
    const [standalone, workflow, legacy, inactive, system] =
      await db!.chargeDefinition.createManyAndReturn({
        data: [
          { code: "T17-MANUAL-STANDALONE" },
          { code: "T17-MANUAL-WORKFLOW" },
          { code: "T17-MANUAL-LEGACY", appliesToLoanRequests: true },
          { code: "T17-MANUAL-INACTIVE", isActive: false },
          { code: systemBillingChargeCodes[1]! },
        ].map((row) => ({
          ...row,
          tenantId,
          appliesToMembers: false,
          name: "Manual parity",
          amount: 900,
          kind: "fixed",
          chargeFrequency: "manual",
        })),
      })
    await db!.chargeApplicability.createMany({
      data: [
        {
          tenantId,
          chargeDefinitionId: workflow!.id,
          workflow: "loan_request",
          trigger: "submission",
        },
        {
          tenantId,
          chargeDefinitionId: standalone!.id,
          isActive: false,
          workflow: "loan_request",
          trigger: "submission",
        },
      ],
    })
    await db!.chargeDefinitionVersion.createMany({
      data: [
        ...[standalone!, workflow!, legacy!, inactive!, system!].map(
          ({ id }) => ({
            tenantId,
            chargeDefinitionId: id,
            amount: 500,
            effectiveFrom: earlier,
            kind: "fixed" as const,
          })
        ),
        {
          tenantId,
          chargeDefinitionId: standalone!.id,
          amount: 700,
          effectiveFrom: later,
          kind: "fixed",
        },
        {
          tenantId,
          chargeDefinitionId: standalone!.id,
          amount: 2,
          effectiveFrom: percentageFrom,
          kind: "percentage",
          chargeValueType: "percentage",
        },
      ],
    })
    const pickerOn = (assessedAt: Date) =>
      getMobileAdminChargeRulesForApply(
        { assessedAt, search: "Manual parity", tenantId },
        db!
      )
    expect(
      (await pickerOn(now)).data.map(({ id, rate }) => ({ id, rate }))
    ).toEqual([{ id: standalone!.id, rate: 500 }])
    expect((await pickerOn(later)).data.map(({ rate }) => rate)).toEqual([700])
    expect((await pickerOn(percentageFrom)).data).toEqual([])

    await db!.tenant.update({
      where: { id: tenantId },
      data: { initialMigrationStatus: "live_operations" },
    })
    await ensureTenantLedgerAccounts(tenantId, db!)
    const actor = await db!.user.create({
      data: {
        tenantId,
        email: `mobile-charge-${crypto.randomUUID()}@example.test`,
        fullName: "Finance test",
        passwordHash: "test-only",
      },
    })
    const apply = (
      chargeDefinitionId: string,
      assessedAt = now,
      expectedAmount = 500
    ) =>
      applyMobileAdminCharge({
        actorUserId: actor.id,
        assessedAt,
        basisAmount: 10000,
        chargeDefinitionId,
        commandId: crypto.randomUUID(),
        expectedAmount,
        expectedState: "available",
        memberId: distantMemberId,
        tenantId,
      })

    await expect(apply(workflow!.id)).rejects.toThrow("linked workflow")
    await expect(apply(legacy!.id)).rejects.toThrow("linked workflow")
    await expect(apply(system!.id)).rejects.toThrow(
      "Charge definition not found"
    )
    await expect(apply(inactive!.id)).rejects.toThrow(
      "Charge definition not found"
    )
    await expect(apply(standalone!.id, percentageFrom, 200)).rejects.toThrow(
      "linked workflow"
    )
    await expect(apply(standalone!.id, now, 900)).rejects.toThrow(
      "charge amount changed"
    )
    const saved = await apply(standalone!.id)
    const row = await db!.chargeApplication.findUniqueOrThrow({
      where: { id: saved.entityId },
    })
    expect([row.status, Number(row.amount), row.chargeApplicabilityId]).toEqual(
      ["posted", 500, null]
    )
  })
})
