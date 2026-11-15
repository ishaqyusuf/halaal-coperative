import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { applyImportBatch, createImportBatch, undoImportBatch } from "./imports"

const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `import-undo-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""

function memberRow(memberNumber: string, extra: Record<string, unknown> = {}) {
  return {
    fullName: `Undo Member ${memberNumber}`,
    joinedAt: "2025-02-01T00:00:00.000Z",
    memberNumber,
    memberType: "individual",
    status: "active",
    ...extra,
  }
}

async function addFile(
  importType: "contributions" | "deduction_sources" | "members",
  payloads: Array<Record<string, unknown>>,
  existingMatch = false
) {
  const batch = await createImportBatch(
    {
      actorUserId: userId,
      duplicateRowCount: 0,
      existingMatchCount: existingMatch ? payloads.length : 0,
      importType,
      rows: payloads.map((payload, index) => ({
        duplicateInFile: false,
        existingMatch,
        payload,
        primaryValue: String(payload.memberNumber ?? payload.name),
        rowIndex: index + 1,
      })),
      sourceCsv: `${importType}:${JSON.stringify(payloads)}:${crypto.randomUUID()}`,
      tenantId,
      validRows: payloads.length,
    },
    db!
  )
  await applyImportBatch(
    { actorUserId: userId, batchId: batch.id, tenantId },
    db!
  )
  return batch.id
}

function undo(batchId: string) {
  return undoImportBatch({ actorUserId: userId, batchId, tenantId }, db!)
}

function batchStatus(batchId: string) {
  return db!.importBatch
    .findUniqueOrThrow({ select: { status: true }, where: { id: batchId } })
    .then((batch) => batch.status)
}

function membersNamed(...memberNumbers: string[]) {
  return db!.member.count({
    where: { memberNumber: { in: memberNumbers }, tenantId },
  })
}

run("undo a member or workplace import", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "historical_setup_in_progress",
        name: "Import Undo Cooperative",
        slug,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    await db!.tenantPolicy.create({
      data: {
        migrationSetupConfirmedAt: new Date(),
        migrationSetupMode: "brought_forward",
        tenantId,
      },
    })
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Import Undo Officer",
          tenantId,
        },
      })
    ).id
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.importBatch.deleteMany({ where: { tenantId } })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("removes the members a file added, with their commitments, and the file can be added again", async () => {
    const payloads = [
      memberRow("UNDO-1", { monthlyCommitment: 10000 }),
      memberRow("UNDO-2"),
    ]
    const batchId = await addFile("members", payloads)
    expect(await membersNamed("UNDO-1", "UNDO-2")).toBe(2)

    await expect(undo(batchId)).resolves.toMatchObject({ removed: 2 })
    expect(await membersNamed("UNDO-1", "UNDO-2")).toBe(0)
    expect(await db!.contributionPlan.count({ where: { tenantId } })).toBe(0)
    expect(await batchStatus(batchId)).toBe("undone")

    // Undone twice is refused; the same people can be added again.
    await expect(undo(batchId)).rejects.toThrow("Only an added import")
    await addFile("members", payloads)
    expect(await membersNamed("UNDO-1", "UNDO-2")).toBe(2)
  })

  it("refuses while any member from the file has a record, and removes nothing", async () => {
    const batchId = await addFile("members", [
      memberRow("UNDO-3"),
      memberRow("UNDO-4"),
    ])
    const member = await db!.member.findFirstOrThrow({
      where: { memberNumber: "UNDO-4", tenantId },
    })
    await db!.contribution.create({
      data: {
        amount: 1000,
        channel: "cash",
        memberId: member.id,
        postedAt: new Date("2025-03-01T00:00:00.000Z"),
        tenantId,
      },
    })

    await expect(undo(batchId)).rejects.toThrow("already have records")
    expect(await membersNamed("UNDO-3", "UNDO-4")).toBe(2)
    expect(await batchStatus(batchId)).toBe("applied")
  })

  it("refuses a file that also changed members already in Halaalvest", async () => {
    const batchId = await addFile("members", [memberRow("UNDO-1")], true)

    await expect(undo(batchId)).rejects.toThrow("already in Halaalvest")
    expect(await batchStatus(batchId)).toBe("applied")
  })

  it("removes unused workplaces and refuses one a member belongs to", async () => {
    const unused = await addFile("deduction_sources", [
      { name: "Undo Water Board", type: "employer_payroll" },
    ])
    await expect(undo(unused)).resolves.toMatchObject({ removed: 1 })
    expect(
      await db!.deductionSource.count({
        where: { name: "Undo Water Board", tenantId },
      })
    ).toBe(0)

    const used = await addFile("deduction_sources", [
      { name: "Undo Health Ministry", type: "employer_payroll" },
    ])
    const workplace = await db!.deductionSource.findFirstOrThrow({
      where: { name: "Undo Health Ministry", tenantId },
    })
    await db!.member.updateMany({
      data: { deductionSourceId: workplace.id },
      where: { memberNumber: "UNDO-3", tenantId },
    })
    await expect(undo(used)).rejects.toThrow("already in use")
    expect(await batchStatus(used)).toBe("applied")
  })

  it("never undoes a kind that moves money", async () => {
    const batchId = await addFile("contributions", [
      {
        amount: 500,
        channel: "cash",
        memberNumber: "UNDO-3",
        periodLabel: "April 2025",
        postedAt: "2025-04-01T00:00:00.000Z",
      },
    ])

    await expect(undo(batchId)).rejects.toThrow(
      "Only member and workplace imports"
    )
    expect(await batchStatus(batchId)).toBe("applied")
  })
})
