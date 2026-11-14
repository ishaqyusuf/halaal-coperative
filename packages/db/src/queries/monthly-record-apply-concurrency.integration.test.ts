import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
} from "./monthly-records"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `monthly-apply-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let memberId = ""
let monthlyRecordId = ""

async function createPendingRow(recordId = monthlyRecordId) {
  const row = await db!.monthlyRecordMember.create({
    data: {
      calculatedPayableAmount: 5000,
      contributionAmount: 5000,
      memberId,
      monthlyRecordId: recordId,
      tenantId,
    },
  })
  return row.id
}

async function createMonthlyRecord(periodMonth: number, periodLabel: string) {
  return (
    await db!.monthlyRecord.create({
      data: {
        createdByUserId: userId,
        periodLabel,
        periodMonth,
        periodYear: 2026,
        tenantId,
      },
    })
  ).id
}

function cancel(monthlyRecordMemberId: string) {
  return cancelMonthlyRecordMember(
    { actorUserId: userId, monthlyRecordMemberId, tenantId },
    db!
  )
}

function taggedCharges(rowId: string) {
  return db!.chargeApplication.findMany({
    orderBy: { createdAt: "asc" },
    where: {
      applicabilitySnapshot: { equals: rowId, path: ["monthlyRecordMemberId"] },
      tenantId,
    },
  })
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

  it("undoes the row's levy on cancel, so re-applying charges it once", async () => {
    const before = await db!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    const aprilRecordId = (
      await db!.monthlyRecord.create({
        data: {
          createdByUserId: userId,
          periodLabel: "April 2026",
          periodMonth: 4,
          periodYear: 2026,
          tenantId,
        },
      })
    ).id
    const rowId = await createPendingRow(aprilRecordId)
    await apply(rowId)

    const levy = await db!.chargeApplication.findFirstOrThrow({
      where: {
        applicabilitySnapshot: {
          equals: rowId,
          path: ["monthlyRecordMemberId"],
        },
        tenantId,
      },
    })
    expect(levy.status).toBe("posted")

    await cancelMonthlyRecordMember(
      { actorUserId: userId, monthlyRecordMemberId: rowId, tenantId },
      db!
    )
    expect(
      (
        await db!.chargeApplication.findUniqueOrThrow({
          where: { id: levy.id },
        })
      ).status
    ).toBe("reversed")
    const afterCancel = await db!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    // Payment and levy both undone: savings back where they started.
    expect(Number(afterCancel.totalSavingsSnapshot)).toBe(
      Number(before.totalSavingsSnapshot)
    )

    await apply(rowId)
    const live = await db!.chargeApplication.count({
      where: {
        applicabilitySnapshot: {
          equals: rowId,
          path: ["monthlyRecordMemberId"],
        },
        status: "posted",
        tenantId,
      },
    })
    expect(live).toBe(1)
    const afterReapply = await db!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    expect(Number(afterReapply.totalSavingsSnapshot)).toBe(
      Number(before.totalSavingsSnapshot) + 4500
    )
  })

  it("waives a tagged charge still waiting for a separate payment", async () => {
    const definition = await db!.chargeDefinition.create({
      data: {
        amount: 200,
        code: "MONTHLY_DUES",
        kind: "fixed",
        name: "Monthly dues",
        tenantId,
      },
    })
    await db!.chargeDefinitionVersion.create({
      data: {
        amount: 200,
        chargeDefinitionId: definition.id,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        kind: "fixed",
        tenantId,
      },
    })
    const applicability = await db!.chargeApplicability.create({
      data: {
        chargeDefinitionId: definition.id,
        collectionMode: "pay_separately",
        tenantId,
        trigger: "monthly_collection",
        workflow: "commitment_collection",
      },
    })

    try {
      const rowId = await createPendingRow(
        await createMonthlyRecord(5, "May 2026")
      )
      await apply(rowId)
      const applied = await taggedCharges(rowId)
      expect(applied.map((charge) => charge.status).sort()).toEqual([
        "pending",
        "posted",
      ])

      await cancel(rowId)

      const after = await taggedCharges(rowId)
      const dues = after.find(
        (charge) => charge.chargeDefinitionId === definition.id
      )
      const levy = after.find(
        (charge) => charge.chargeDefinitionId !== definition.id
      )
      expect(dues?.status).toBe("waived")
      expect(levy?.status).toBe("reversed")
      // A pending waiver moves no money: only the posted levy gets a correction.
      expect(
        await db!.ledgerTransaction.count({
          where: { reference: `charge-correction:${dues!.id}`, tenantId },
        })
      ).toBe(0)
      expect(
        await db!.ledgerTransaction.count({
          where: { reference: `charge-correction:${levy!.id}`, tenantId },
        })
      ).toBe(1)
      const audit = await db!.auditLog.findFirstOrThrow({
        where: { action: "charge.waived", entityId: dues!.id, tenantId },
      })
      expect(JSON.stringify(audit.metadata)).toContain("May 2026")
    } finally {
      // Later tests expect only the levy on monthly collection.
      await db!.chargeApplicability.update({
        data: { isActive: false },
        where: { id: applicability.id },
      })
    }
  })

  it("leaves untagged charges from before the fix alone", async () => {
    const rowId = await createPendingRow(
      await createMonthlyRecord(6, "June 2026")
    )
    await apply(rowId)
    const [tagged] = await taggedCharges(rowId)
    // Simulate a row applied before the tag existed: drop the tag.
    const { monthlyRecordMemberId: _tag, ...legacySnapshot } = tagged!
      .applicabilitySnapshot as Record<string, unknown>
    await db!.chargeApplication.update({
      data: { applicabilitySnapshot: legacySnapshot as never },
      where: { id: tagged!.id },
    })

    await cancel(rowId)

    const legacy = await db!.chargeApplication.findUniqueOrThrow({
      where: { id: tagged!.id },
    })
    expect(legacy.status).toBe("posted")
    expect(
      await db!.ledgerTransaction.count({
        where: { reference: `charge-correction:${legacy.id}`, tenantId },
      })
    ).toBe(0)
  })

  it("never reverses twice when a row is cancelled twice", async () => {
    const rowId = await createPendingRow(
      await createMonthlyRecord(7, "July 2026")
    )
    await apply(rowId)
    const [levy] = await taggedCharges(rowId)

    const results = await Promise.allSettled([cancel(rowId), cancel(rowId)])
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    await expect(cancel(rowId)).rejects.toThrow("already cancelled")

    expect(
      (
        await db!.chargeApplication.findUniqueOrThrow({
          where: { id: levy!.id },
        })
      ).status
    ).toBe("reversed")
    expect(
      await db!.ledgerTransaction.count({
        where: { reference: `charge-correction:${levy!.id}`, tenantId },
      })
    ).toBe(1)
  })
})
