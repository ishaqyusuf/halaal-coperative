import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { postCollectionSourceContributionBatchRows } from "./collection-source-batches"
import { createWorkplace, listWorkplaces, renameWorkplace } from "./imports"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  receiveWorkplaceMonthlyPayments,
} from "./monthly-records"
import { ensureTenantOperationProfileDefaults } from "./operation-profile"

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
  memberIds[key] = member.id
  return member.id
}


const memberIds: Record<string, string> = {}

async function workplaceBatchId() {
  return (
    await db!.collectionSourceContributionBatch.findFirstOrThrow({
      where: { deductionSourceId: workplaceId, tenantId },
    })
  ).id
}

// A collected row on the contributions-page workplace batch, ready to post.
async function addCollectedBatchRow(key: string) {
  const row = await db!.collectionSourceContributionBatchRow.create({
    data: {
      batchId: await workplaceBatchId(),
      expectedAmount: 5000,
      memberId: memberIds[key]!,
      paidAmount: 5000,
      status: "collected",
      tenantId,
    },
  })
  return row.id
}

function markPaid(key: string) {
  return applyMonthlyRecordMember(
    {
      actorUserId: userId,
      monthlyRecordMemberId: rowIds[key]!,
      tenantId,
      totalPaidAmount: 5000,
    },
    db!
  )
}

function liveContributions(key: string) {
  return db!.contribution.count({
    where: { memberId: memberIds[key]!, status: { not: "reversed" }, tenantId },
  })
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

    // The contributions-page workplace batch post needs its service on.
    await ensureTenantOperationProfileDefaults(tenantId, db!)
    const profile = await db!.tenantOperationProfile.findUniqueOrThrow({
      where: { tenantId },
    })
    await db!.tenantServiceSetting.upsert({
      create: {
        accessMode: "office_only",
        operationProfileId: profile.id,
        serviceKey: "collection_source_batch_posting",
        tenantId,
      },
      update: { accessMode: "office_only" },
      where: {
        tenantId_serviceKey: {
          serviceKey: "collection_source_batch_posting",
          tenantId,
        },
      },
    })

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

  it("adds and renames workplaces with unique names and member counts", async () => {
    const added = await createWorkplace(
      { actorUserId: userId, name: "  Water   Board ", tenantId },
      db!
    )
    expect(added.name).toBe("Water Board")
    await expect(
      createWorkplace({ actorUserId: userId, name: "water board", tenantId }, db!)
    ).rejects.toThrow("already exists")
    await expect(
      renameWorkplace(
        { actorUserId: userId, id: added.id, name: "City Council", tenantId },
        db!
      )
    ).rejects.toThrow("already exists")

    const renamed = await renameWorkplace(
      { actorUserId: userId, id: added.id, name: "State Water Board", tenantId },
      db!
    )
    expect(renamed.name).toBe("State Water Board")

    const list = await listWorkplaces(tenantId, db!)
    expect(list.find((item) => item.id === workplaceId)?.memberCount).toBe(5)
    expect(list.find((item) => item.id === added.id)?.memberCount).toBe(0)
  })

  describe("monthly record and workplace batch guard each other", () => {
    it("skips a batch post for a member already marked paid this month", async () => {
      await addMember("e", workplaceId)
      await markPaid("e")
      const batchRowId = await addCollectedBatchRow("e")

      const result = await postCollectionSourceContributionBatchRows(
        {
          actorUserId: userId,
          batchId: await workplaceBatchId(),
          rowIds: [batchRowId],
          tenantId,
        },
        db!
      )

      expect(result.skipped).toEqual([
        expect.objectContaining({ reason: "already_paid_this_month", rowId: batchRowId }),
      ])
      expect(await liveContributions("e")).toBe(1)
      const row = await db!.collectionSourceContributionBatchRow.findUniqueOrThrow({
        where: { id: batchRowId },
      })
      expect(row.status).toBe("skipped")
      expect(row.contributionId).toBeNull()
    })

    it("refuses Mark paid and skips bulk receive for a member paid by a batch", async () => {
      await addMember("f", workplaceId)
      const batchRowId = await addCollectedBatchRow("f")
      await postCollectionSourceContributionBatchRows(
        {
          actorUserId: userId,
          batchId: await workplaceBatchId(),
          rowIds: [batchRowId],
          tenantId,
        },
        db!
      )
      expect(await liveContributions("f")).toBe(1)

      await expect(markPaid("f")).rejects.toThrow("through a workplace batch")
      const bulk = await receive([rowIds.f!])
      expect(bulk.skipped).toEqual([
        { reason: "paid_by_workplace_batch", rowId: rowIds.f! },
      ])
      expect(await liveContributions("f")).toBe(1)
    })

    it("pays once when Mark paid and a batch post race for the same member", async () => {
      await addMember("g", workplaceId)
      const batchRowId = await addCollectedBatchRow("g")
      const batchId = await workplaceBatchId()

      await Promise.allSettled([
        markPaid("g"),
        postCollectionSourceContributionBatchRows(
          { actorUserId: userId, batchId, rowIds: [batchRowId], tenantId },
          db!
        ),
      ])

      expect(await liveContributions("g")).toBe(1)
    })

    it("lets a member be paid again after the payment is undone", async () => {
      await cancelMonthlyRecordMember(
        { actorUserId: userId, monthlyRecordMemberId: rowIds.a!, tenantId },
        db!
      )
      expect(await liveContributions("a")).toBe(0)

      await markPaid("a")
      expect(await liveContributions("a")).toBe(1)
    })
  })
})
