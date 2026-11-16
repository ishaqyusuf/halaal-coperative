import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { importMembers } from "./imports"

/**
 * Equivalence check for the set-based member re-import (audit L7): members
 * already in Halaalvest are written with one UPDATE per 500 rows instead of
 * one `member.update` per row. Each member must end up exactly as the
 * per-row update left it: required fields replaced, an optional column the
 * file leaves out kept, an empty cell cleared to null.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `import-batch-it-${crypto.randomUUID().slice(0, 8)}`
const count = 520 // more than one 500-row chunk
let tenantId = ""
let userId = ""
let sourceIds: string[] = []

type Row = Parameters<typeof importMembers>[0]["rows"][number]

function rowsFor(version: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    deductionSourceName: `Source ${(index + version) % 3}`,
    fullName: `Batch Member ${index} v${version}`,
    joinedAt: new Date(Date.UTC(2025, index % 12, 1)),
    memberNumber: `BATCH-${String(index).padStart(4, "0")}`,
    memberType: "individual",
    monthlyCommitment: 5000 + version,
    ...((index + version) % 2
      ? { email: `member-${index}@example.test`, phoneNumber: ` 080${index} ` }
      : {}),
    ...((index + version) % 3 === 0
      ? {
          kycStatus: version === 2 ? "pending" : "verified",
          occupation: version === 2 ? "" : "Trader",
          openingSavingsBalance: 1000 + version,
        }
      : {}),
  })) as Row[]
}

type Stored = {
  deductionSourceName: string | null
  email: string | null
  fullName: string
  kycStatus: string
  occupation: string | null
  phoneNumber: string | null
  savings: number
}

/** What the per-row `member.update` wrote for `row` over `previous`. */
function expectedAfter(previous: Stored, row: Row): Stored {
  const trimmed = (value: string | undefined) => value?.trim() || null
  return {
    deductionSourceName: row.deductionSourceName ?? null,
    email: row.email !== undefined ? trimmed(row.email) : previous.email,
    fullName: row.fullName,
    kycStatus: row.kycStatus ?? previous.kycStatus,
    occupation:
      row.occupation !== undefined
        ? trimmed(row.occupation)
        : previous.occupation,
    phoneNumber:
      row.phoneNumber !== undefined
        ? trimmed(row.phoneNumber)
        : previous.phoneNumber,
    savings: row.openingSavingsBalance ?? previous.savings,
  }
}

async function readMembers() {
  const members = await db!.member.findMany({
    include: {
      contributionPlans: { select: { amount: true, startsAt: true } },
      deductionSource: { select: { name: true } },
    },
    orderBy: { memberNumber: "asc" },
    where: { memberNumber: { startsWith: "BATCH-" }, tenantId },
  })
  return new Map(
    members.map((member) => [
      member.memberNumber,
      {
        plans: member.contributionPlans.map((plan) => Number(plan.amount)),
        stored: {
          deductionSourceName: member.deductionSource?.name ?? null,
          email: member.email,
          fullName: member.fullName,
          kycStatus: member.kycStatus,
          occupation: member.occupation,
          phoneNumber: member.phoneNumber,
          savings: Number(member.totalSavingsSnapshot),
        } satisfies Stored,
      },
    ])
  )
}

run("member re-import writes existing members in batches", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "historical_setup_in_progress",
        name: "Import Batching Cooperative",
        slug,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Import Batching Officer",
          tenantId,
        },
      })
    ).id
    sourceIds = await Promise.all(
      [0, 1, 2].map(async (index) =>
        db!.deductionSource
          .create({
            data: {
              name: `Source ${index}`,
              tenantId,
              type: "employer_payroll",
            },
          })
          .then((source) => source.id)
      )
    )
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("matches the per-row update, keeps omitted columns and stays idempotent", async () => {
    const first = rowsFor(1)
    await importMembers({ actorUserId: userId, rows: first, tenantId }, db!)
    const afterFirst = await readMembers()
    expect(afterFirst.size).toBe(count)
    expect(sourceIds).toHaveLength(3)

    const second = rowsFor(2)
    await importMembers({ actorUserId: userId, rows: second, tenantId }, db!)
    const afterSecond = await readMembers()

    for (const row of second) {
      const before = afterFirst.get(row.memberNumber)!.stored
      const after = afterSecond.get(row.memberNumber)!
      expect(after.stored).toEqual(expectedAfter(before, row))
      // The existing commitment plan is updated, not duplicated.
      expect(after.plans).toEqual([5002])
    }
    expect(
      await db!.memberAmountLog.count({
        where: { amount: 5002, tenantId },
      })
    ).toBe(count)

    // Adding the same file again changes nothing.
    await importMembers({ actorUserId: userId, rows: second, tenantId }, db!)
    expect(await readMembers()).toEqual(afterSecond)
    expect(await db!.contributionPlan.count({ where: { tenantId } })).toBe(
      count
    )
    expect(await db!.memberAmountLog.count({ where: { tenantId } })).toBe(count)
  })

  it("a bad row fails the whole file and leaves every member as it was", async () => {
    const before = await readMembers()
    const rows = rowsFor(3)
    rows[count - 1] = { ...rows[count - 1]!, status: "not-a-status" as never }

    await expect(
      importMembers({ actorUserId: userId, rows, tenantId }, db!)
    ).rejects.toThrow()
    expect(await readMembers()).toEqual(before)
  })
})
