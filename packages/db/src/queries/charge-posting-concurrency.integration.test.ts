import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  applyApplicableWorkflowCharges,
  applyCharge,
  settleChargeApplication,
} from "./charges"
import {
  ensureTenantLedgerAccounts,
  getLedgerAccountByCode,
  paymentReferenceIdempotencyKey,
  postLedgerTransaction,
} from "./ledger"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `charge-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let memberIds: string[] = []
let definitionId = ""

async function createMember(index: number) {
  const member = await db!.member.create({
    data: {
      fullName: `Concurrency Member ${index}`,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      memberNumber: `${slug}-${index}`,
      memberType: "individual",
      tenantId,
    },
  })
  return member.id
}

async function createPendingSeparateCharge(memberId: string) {
  return applyCharge(
    {
      actorUserId: userId,
      amount: 2500,
      assessedAt: new Date(),
      chargeDefinitionId: definitionId,
      collectionMode: "pay_separately",
      memberId,
      tenantId,
    },
    db!
  )
}

async function createProcurementRequest(memberId: string) {
  return db!.procurementRequest.create({
    data: {
      createdByUserId: userId,
      estimatedMonthlyRepayment: 10_000,
      itemName: "Deep freezer",
      memberId,
      requestedAt: new Date(),
      requestedCost: 120_000,
      requestedRepaymentMonths: 12,
      tenantId,
    },
  })
}

run("charge and ledger posting under concurrency", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        name: "Charge Concurrency Cooperative",
        slug,
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Charge Concurrency Officer",
          passwordHash: "test-only",
          tenantId,
        },
      })
    ).id
    memberIds = [await createMember(1), await createMember(2)]
    await ensureTenantLedgerAccounts(tenantId, db!)

    const definition = await db!.chargeDefinition.create({
      data: {
        amount: 2500,
        code: "PROC_FEE",
        kind: "fixed",
        name: "Procurement processing fee",
        tenantId,
      },
    })
    definitionId = definition.id
    await db!.chargeDefinitionVersion.create({
      data: {
        amount: 2500,
        chargeDefinitionId: definition.id,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        kind: "fixed",
        tenantId,
      },
    })
    await db!.chargeApplicability.create({
      data: {
        chargeDefinitionId: definition.id,
        collectionMode: "deduct_from_savings",
        tenantId,
        trigger: "submission",
        workflow: "procurement_request",
      },
    })
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.ledgerTransaction.deleteMany({ where: { tenantId } })
      await db.chargeApplication.deleteMany({ where: { tenantId } })
      await db.procurementRequest.deleteMany({ where: { tenantId } })
      await db.tenant.deleteMany({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("lets only one separate charge settle with a shared payment reference", async () => {
    const [first, second] = await Promise.all(
      memberIds.map((memberId) => createPendingSeparateCharge(memberId))
    )
    const settle = (chargeApplicationId: string, reference: string) =>
      settleChargeApplication(
        {
          actorUserId: userId,
          chargeApplicationId,
          paidAt: new Date(),
          reference,
          tenantId,
        },
        db!
      )

    // Different casing must still collide on the normalized claim key.
    const results = await Promise.allSettled([
      settle(first.id, "BANK-TRF-0001"),
      settle(second.id, "bank-trf-0001"),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect((rejected as PromiseRejectedResult).reason.message).toContain(
      "payment reference has already been posted"
    )
    expect(
      await db!.ledgerTransaction.count({
        where: {
          idempotencyKey: paymentReferenceIdempotencyKey("BANK-TRF-0001"),
          tenantId,
        },
      })
    ).toBe(1)
    // The losing application stays pending and can settle with a new reference.
    expect(
      await db!.chargeApplication.count({
        where: { id: { in: [first.id, second.id] }, status: "pending" },
      })
    ).toBe(1)
  })

  it("rejects concurrent raw postings that claim the same idempotency key", async () => {
    const cash = await getLedgerAccountByCode(tenantId, "2000", db!)
    const income = await getLedgerAccountByCode(tenantId, "3000", db!)
    const post = () =>
      postLedgerTransaction(
        {
          entries: [
            { amount: 100, direction: "debit", ledgerAccountId: cash!.id },
            { amount: 100, direction: "credit", ledgerAccountId: income!.id },
          ],
          idempotencyKey: "integration:same-posting",
          postedAt: new Date(),
          tenantId,
          transactionType: "charge",
        },
        db!
      )

    const results = await Promise.allSettled([post(), post(), post()])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(
      await db!.ledgerTransaction.count({
        where: { idempotencyKey: "integration:same-posting", tenantId },
      })
    ).toBe(1)
  })

  it("applies one workflow charge per target when submissions race", async () => {
    const request = await createProcurementRequest(memberIds[0]!)
    const apply = () =>
      applyApplicableWorkflowCharges(
        {
          actorUserId: userId,
          assessedAt: request.requestedAt,
          basisAmount: 120_000,
          memberId: memberIds[0]!,
          procurementRequestId: request.id,
          tenantId,
          trigger: "submission",
          workflow: "procurement_request",
        },
        db!
      )

    const results = await Promise.allSettled([apply(), apply(), apply()])

    expect(
      results.filter((result) => result.status === "fulfilled").length
    ).toBeGreaterThanOrEqual(1)
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason.message).toContain("already been applied")
      }
    }

    const applications = await db!.chargeApplication.findMany({
      where: { procurementRequestId: request.id, tenantId },
    })
    expect(applications).toHaveLength(1)
    expect(applications[0]!.workflowIdempotencyKey).toBe(
      `procurement_request:${request.id}:${definitionId}`
    )
    expect(
      await db!.ledgerTransaction.count({
        where: { chargeApplicationId: applications[0]!.id },
      })
    ).toBe(1)
    expect(applications[0]!.applicabilitySnapshot).toMatchObject({
      amount: 2500,
      basisAmount: 120_000,
      collectionMode: "deduct_from_savings",
      schemaVersion: 1,
      source: "workflow_applicability",
      target: { id: request.id, type: "procurement_request" },
      trigger: "submission",
      version: { amount: 2500, effectiveFrom: "2026-01-01T00:00:00.000Z" },
      workflow: "procurement_request",
    })

    // A sequential retry returns the existing application without posting.
    const [retried] = await apply()
    expect(retried.id).toBe(applications[0]!.id)
  })

  it("rejects automated charges whose target belongs to another member or workflow", async () => {
    const request = await createProcurementRequest(memberIds[0]!)

    await expect(
      applyApplicableWorkflowCharges(
        {
          actorUserId: userId,
          assessedAt: new Date(),
          basisAmount: 120_000,
          memberId: memberIds[1]!,
          procurementRequestId: request.id,
          tenantId,
          trigger: "submission",
          workflow: "procurement_request",
        },
        db!
      )
    ).rejects.toThrow("belongs to a different member")

    await expect(
      applyApplicableWorkflowCharges(
        {
          actorUserId: userId,
          assessedAt: new Date(),
          basisAmount: 120_000,
          memberId: memberIds[0]!,
          procurementRequestId: request.id,
          tenantId,
          trigger: "submission",
          workflow: "loan_request",
        },
        db!
      )
    ).rejects.toThrow("exactly the target for their workflow")

    expect(
      await db!.chargeApplication.count({
        where: { procurementRequestId: request.id },
      })
    ).toBe(0)
  })
})
