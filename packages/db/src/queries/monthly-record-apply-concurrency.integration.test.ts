import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import { applyMonthlyRecordMember } from "./monthly-records"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `monthly-apply-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let memberId = ""
let monthlyRecordId = ""

async function createPendingRow() {
  const row = await db!.monthlyRecordMember.create({
    data: {
      calculatedPayableAmount: 5000,
      contributionAmount: 5000,
      memberId,
      monthlyRecordId,
      tenantId,
    },
  })
  return row.id
}

function apply(monthlyRecordMemberId: string) {
  return applyMonthlyRecordMember(
    {
      actorUserId: userId,
      monthlyRecordMemberId,
      tenantId,
      totalPaidAmount: 5000,
    },
    db!
  )
}

run("monthly record apply under concurrency", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        name: "Monthly Apply Concurrency Cooperative",
        slug,
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Monthly Apply Officer",
          passwordHash: "test-only",
          tenantId,
        },
      })
    ).id
    memberId = (
      await db!.member.create({
        data: {
          fullName: "Monthly Apply Member",
          joinedAt: new Date("2026-01-01T00:00:00.000Z"),
          memberNumber: `${slug}-1`,
          memberType: "individual",
          tenantId,
        },
      })
    ).id
    await ensureTenantLedgerAccounts(tenantId, db!)
    monthlyRecordId = (
      await db!.monthlyRecord.create({
        data: {
          createdByUserId: userId,
          periodLabel: "March 2026",
          periodMonth: 3,
          periodYear: 2026,
          tenantId,
        },
      })
    ).id

    const definition = await db!.chargeDefinition.create({
      data: {
        amount: 500,
        code: "MONTHLY_LEVY",
        kind: "fixed",
        name: "Monthly levy",
        tenantId,
      },
    })
    await db!.chargeDefinitionVersion.create({
      data: {
        amount: 500,
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
        trigger: "monthly_collection",
        workflow: "commitment_collection",
      },
    })
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.ledgerTransaction.deleteMany({ where: { tenantId } })
      await db.chargeApplication.deleteMany({ where: { tenantId } })
      await db.contribution.deleteMany({ where: { tenantId } })
      await db.tenant.deleteMany({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("posts one payment and one charge set when one row is applied concurrently", async () => {
    const rowId = await createPendingRow()

    const results = await Promise.allSettled([
      apply(rowId),
      apply(rowId),
      apply(rowId),
    ])

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason.message).toContain("already been applied")
      }
    }

    const row = await db!.monthlyRecordMember.findUniqueOrThrow({
      where: { id: rowId },
    })
    expect(row.status).toBe("applied")
    expect(row.contributionId).not.toBeNull()
    expect(
      await db!.contribution.count({ where: { memberId, tenantId } })
    ).toBe(1)
    expect(
      await db!.chargeApplication.count({ where: { memberId, tenantId } })
    ).toBe(1)
    expect(
      await db!.ledgerTransaction.count({
        where: {
          reference: `monthly-record:${monthlyRecordId}:${rowId}`,
          tenantId,
        },
      })
    ).toBe(1)
    const member = await db!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    // 5000 saved, 500 levy deducted from savings, posted exactly once.
    expect(Number(member.totalSavingsSnapshot)).toBe(4500)
  })
})
