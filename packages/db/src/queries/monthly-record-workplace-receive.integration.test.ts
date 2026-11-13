import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import { receiveWorkplaceMonthlyPayments } from "./monthly-records"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `workplace-receive-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let workplaceId = ""
let otherWorkplaceId = ""
let monthlyRecordId = ""
const rowIds: Record<string, string> = {}

async function addMember(key: string, deductionSourceId: string | null) {
  const member = await db!.member.create({
    data: {
      deductionSourceId,
      fullName: `Workplace Member ${key}`,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      memberNumber: `${slug}-${key}`,
      memberType: "individual",
      tenantId,
    },
  })
  const row = await db!.monthlyRecordMember.create({
    data: {
      calculatedPayableAmount: 5000,
      contributionAmount: 5000,
      memberId: member.id,
      monthlyRecordId,
      tenantId,
      totalPaidAmount: 5000,
    },
  })
  rowIds[key] = row.id
  return member.id
}

function receive(ids: string[], workplace = workplaceId) {
  return receiveWorkplaceMonthlyPayments(
    {
      actorUserId: userId,
      monthlyRecordId,
      rowIds: ids,
      tenantId,
      workplaceId: workplace,
    },
    db!
  )
}

run("workplace bulk receiving", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        name: "Workplace Receive Cooperative",
        slug,
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Workplace Receive Officer",
          passwordHash: "test-only",
          tenantId,
        },
      })
    ).id
    workplaceId = (
      await db!.deductionSource.create({
        data: { name: "Ministry of Health", tenantId, type: "employer_payroll" },
      })
    ).id
    otherWorkplaceId = (
      await db!.deductionSource.create({
        data: { name: "City Council", tenantId, type: "employer_payroll" },
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

    await addMember("a", workplaceId)
    await addMember("b", workplaceId)
    await addMember("c", workplaceId)
    await addMember("d", workplaceId)
    await addMember("other", otherWorkplaceId)
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.collectionSourceContributionBatchRow.deleteMany({
        where: { tenantId },
      })
      await db.collectionSourceContributionBatch.deleteMany({
        where: { tenantId },
      })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.ledgerTransaction.deleteMany({ where: { tenantId } })
      await db.chargeApplication.deleteMany({ where: { tenantId } })
      await db.contribution.deleteMany({ where: { tenantId } })
      await db.tenant.deleteMany({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("posts the ticked members once and records them against the workplace batch", async () => {
    const result = await receive([rowIds.a!, rowIds.b!, rowIds.other!])

    expect(result.receivedCount).toBe(2)
    expect(result.receivedAmount).toBe(10000)
    expect(result.skipped).toEqual([
      { reason: "not_in_workplace", rowId: rowIds.other! },
    ])

    const rows = await db!.monthlyRecordMember.findMany({
      where: { id: { in: [rowIds.a!, rowIds.b!, rowIds.c!] } },
      select: { contributionId: true, id: true, status: true },
    })
    const byId = new Map(rows.map((row) => [row.id, row]))
    expect(byId.get(rowIds.a!)?.status).toBe("applied")
    expect(byId.get(rowIds.b!)?.contributionId).toBeTruthy()
    // An unticked member stays unpaid.
    expect(byId.get(rowIds.c!)?.status).toBe("pending")

    const batch = await db!.collectionSourceContributionBatch.findFirst({
      where: { deductionSourceId: workplaceId, tenantId },
      include: { rows: true },
    })
    expect(batch?.status).toBe("posted")
    expect(batch?.rows).toHaveLength(2)
    expect(batch?.rows.every((row) => row.status === "posted")).toBe(true)
  })

  it("skips members already paid when the same receive runs again", async () => {
    const before = await db!.contribution.count({ where: { tenantId } })
    const result = await receive([rowIds.a!, rowIds.b!])

    expect(result.receivedCount).toBe(0)
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "already_paid",
      "already_paid",
    ])
    expect(await db!.contribution.count({ where: { tenantId } })).toBe(before)
  })

  it("posts each member once when two receives run at the same time", async () => {
    const before = await db!.contribution.count({ where: { tenantId } })
    const results = await Promise.allSettled([
      receive([rowIds.c!, rowIds.d!]),
      receive([rowIds.c!, rowIds.d!]),
    ])
    const fulfilled = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )

    expect(
      fulfilled.reduce((total, result) => total + result.receivedCount, 0)
    ).toBe(2)
    expect(await db!.contribution.count({ where: { tenantId } })).toBe(
      before + 2
    )
  })

  it("does not post a member already paid through a workplace batch", async () => {
    const memberId = await addMember("batch-paid", workplaceId)
    const contribution = await db!.contribution.create({
      data: {
        amount: 5000,
        channel: "payroll",
        memberId,
        postedAt: new Date("2026-03-01T00:00:00.000Z"),
        tenantId,
      },
    })
    const batch = await db!.collectionSourceContributionBatch.findFirstOrThrow({
      where: { deductionSourceId: workplaceId, tenantId },
    })
    await db!.collectionSourceContributionBatchRow.create({
      data: {
        batchId: batch.id,
        contributionId: contribution.id,
        memberId,
        paidAmount: 5000,
        status: "posted",
        tenantId,
      },
    })

    const result = await receive([rowIds["batch-paid"]!])
    expect(result.receivedCount).toBe(0)
    expect(result.skipped).toEqual([
      { reason: "paid_by_workplace_batch", rowId: rowIds["batch-paid"]! },
    ])
  })

  it("rejects an empty or oversized selection", async () => {
    await expect(receive([])).rejects.toThrow("Choose at least one member")
    await expect(
      receive(Array.from({ length: 501 }, () => crypto.randomUUID()))
    ).rejects.toThrow("at most 500")
  })
})
