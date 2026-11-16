import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { applyBackfillBatch, saveBackfillDraft } from "./backfill"
import { applyCharge } from "./charges"
import { recordContribution } from "./contributions"
import { ensureTenantLedgerAccounts } from "./ledger"
import { createMemberShareLedgerEntry } from "./tenant-finance"

/**
 * Equivalence check for the batched member backfill (audit L7).
 *
 * Member A's months are applied by `applyBackfillBatch`, which now collects
 * contributions, share entries and charges and writes them with createMany.
 * Member B gets the same months through the per-row functions the apply used
 * to call (`recordContribution`, `createMemberShareLedgerEntry`,
 * `applyCharge`). Every row, ledger posting and audit entry must match, so a
 * change to either side fails here.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `backfill-batch-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let memberA = ""
let memberB = ""
let plainChargeId = ""
let levyChargeId = ""

const months = Array.from({ length: 14 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 10 + index, 1))
  return date.toISOString().slice(0, 7)
})

function draftRow(month: string, index: number) {
  const skipped = index === 3 ? "missed" : index === 7 ? "paused" : "posted"
  return {
    amount: 10000,
    chargeValues: {
      LEVY: index % 2 ? 150 : 0,
      PLAIN: 200,
      UNKNOWN: 75,
    },
    dividend: 0,
    existingHistoryImpacts: [],
    isEdited: false,
    loanService: index >= 9 ? 5000 : 0,
    month,
    monthLabel: month,
    netDeposit: 10000 + index * 10,
    pendingLoanPayment: 0,
    share: index === 5 ? 0 : 1000 + index,
    status: skipped,
    ...(index === 9
      ? {
          loanEvent: {
            durationMonths: 6,
            id: "legacy-loan-1",
            label: "Legacy loan",
            loanAmount: 60000,
            monthlyLoanServiceAmount: 5000,
            openingOutstandingPrincipalBalance: 30000,
            startMonth: month,
            topUp: 0,
          },
        }
      : {}),
  }
}

const draft = {
  chargeColumns: [],
  profitPeriods: [],
  rows: months.map(draftRow),
  summary: {},
  warnings: [],
}

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

/** The member's postings with ids and member-specific values masked. */
async function postingsOf(memberId: string) {
  const mask = (value: unknown) =>
    JSON.stringify(value).replaceAll(memberId, "MEMBER").replace(uuid, "ID")
  const [contributions, charges, shares, transactions, audits, member] =
    await Promise.all([
      db!.contribution.findMany({
        omit: { createdAt: true, id: true, memberId: true, updatedAt: true },
        orderBy: { postedAt: "asc" },
        where: { memberId, tenantId },
      }),
      db!.chargeApplication.findMany({
        omit: { createdAt: true, id: true, memberId: true, updatedAt: true },
        orderBy: [{ assessedAt: "asc" }, { amount: "asc" }],
        where: { memberId, tenantId },
      }),
      db!.memberShareLedgerEntry.findMany({
        omit: { createdAt: true, id: true, memberId: true, sourceId: true },
        orderBy: [{ effectiveDate: "asc" }, { amount: "asc" }],
        where: { memberId, tenantId },
      }),
      db!.ledgerTransaction.findMany({
        include: {
          entries: {
            omit: { createdAt: true, id: true, ledgerTransactionId: true },
            orderBy: { direction: "asc" },
          },
        },
        omit: {
          chargeApplicationId: true,
          contributionId: true,
          createdAt: true,
          id: true,
          memberId: true,
        },
        orderBy: [{ postedAt: "asc" }, { transactionType: "asc" }],
        where: {
          memberId,
          tenantId,
          transactionType: { in: ["charge", "contribution", "levy"] },
        },
      }),
      db!.auditLog.findMany({
        omit: { createdAt: true, entityId: true, id: true, occurredAt: true },
        where: {
          action: { in: ["charge.applied", "contribution.recorded"] },
          metadata: { equals: memberId, path: ["memberId"] },
          tenantId,
        },
      }),
      db!.member.findUniqueOrThrow({
        select: { totalSavingsSnapshot: true },
        where: { id: memberId },
      }),
    ])
  return {
    audits: audits.map(mask).sort(),
    charges: charges.map(mask),
    contributions: contributions.map(mask),
    shares: shares.map(mask),
    snapshot: Number(member.totalSavingsSnapshot),
    transactions: transactions.map(mask),
  }
}

/** Posts the months for `memberId` the way the apply did before L7. */
async function postPerRow(memberId: string, batchId: string) {
  const definitions = new Map([
    ["LEVY", levyChargeId],
    ["PLAIN", plainChargeId],
  ])
  for (const row of draft.rows) {
    if (row.status !== "posted") continue
    const rowMonth = new Date(`${row.month}-01T00:00:00.000Z`)
    if (row.share > 0) {
      await recordContribution(
        {
          actorUserId: userId,
          amount: row.share,
          channel: "manual",
          committedAmount: row.amount,
          extraSavingsAmount: Math.max(0, row.netDeposit - row.share),
          memberId,
          notes: "Posted from backfill apply",
          periodLabel: row.month,
          postedAt: rowMonth,
          sourceType: "backfill",
          tenantId,
        },
        db!
      )
      await createMemberShareLedgerEntry(
        {
          amount: row.share,
          createdByUserId: userId,
          effectiveDate: rowMonth,
          memberId,
          notes: `Share posted from backfill ${batchId}`,
          sourceType: "backfill",
          tenantId,
        },
        db!
      )
    }
    for (const [code, amount] of Object.entries(row.chargeValues)) {
      const chargeDefinitionId = definitions.get(code)
      if (!amount || !chargeDefinitionId) continue
      await applyCharge(
        {
          actorUserId: userId,
          amount,
          assessedAt: rowMonth,
          chargeDefinitionId,
          memberId,
          notes: "Posted from backfill apply",
          sourceType: "backfill",
          tenantId,
        },
        db!
      )
    }
  }
}

async function createMember(memberNumber: string) {
  const member = await db!.member.create({
    data: {
      fullName: `Backfill ${memberNumber}`,
      joinedAt: new Date("2024-11-01T00:00:00.000Z"),
      memberNumber,
      memberType: "individual",
      tenantId,
    },
  })
  return member.id
}

run("batched backfill apply matches the per-row postings", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "historical_setup_in_progress",
        name: "Backfill Batching Cooperative",
        slug,
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Backfill Officer",
          tenantId,
        },
      })
    ).id
    await ensureTenantLedgerAccounts(tenantId, db!)
    plainChargeId = (
      await db!.chargeDefinition.create({
        data: {
          amount: 200,
          code: "PLAIN",
          kind: "fixed",
          name: "Admin fee",
          tenantId,
        },
      })
    ).id
    levyChargeId = (
      await db!.chargeDefinition.create({
        data: {
          amount: 150,
          code: "LEVY",
          isMonthlyLevy: true,
          kind: "fixed",
          name: "Welfare levy",
          tenantId,
        },
      })
    ).id
    memberA = await createMember("BF-A")
    memberB = await createMember("BF-B")
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("writes the same rows, ledger and audit entries, and re-applying changes nothing", async () => {
    const draftInput = {
      endMonth: months.at(-1)!,
      startMonth: months[0]!,
    }
    const saved = await saveBackfillDraft(
      {
        actorUserId: userId,
        draft: draft as never,
        draftInput: draftInput as never,
        memberId: memberA,
        tenantId,
      },
      db!
    )
    expect(saved.monthRows).toHaveLength(months.length)
    // The loan event's activity points at its own month row.
    const loanMonth = saved.monthRows.find(
      (row: { activities: unknown[] }) => row.activities.length
    )
    expect(loanMonth).toMatchObject({ month: 8, year: 2025 })
    expect(loanMonth.activities).toEqual([
      expect.objectContaining({
        activityType: "loan_taken",
        amount: expect.anything(),
      }),
    ])

    await applyBackfillBatch(
      { actorUserId: userId, batchId: saved.id, memberId: memberA, tenantId },
      db!
    )
    await postPerRow(memberB, saved.id)

    const [batched, perRow] = await Promise.all([
      postingsOf(memberA),
      postingsOf(memberB),
    ])
    // 12 posted months (two are skipped), one without a share; the levy is
    // on 5 of them and the UNKNOWN code has no definition.
    expect(batched.contributions).toHaveLength(11)
    expect(batched.charges).toHaveLength(12 + 5)
    expect(batched).toEqual({
      ...perRow,
      // The per-row path keeps a running snapshot; the apply recalculates it.
      snapshot: batched.snapshot,
    })
    // Repayments are still posted per month: only the month that carries the
    // legacy loan event resolves a loan here (there is no primary loan).
    expect(
      await db!.repayment.count({ where: { memberId: memberA, tenantId } })
    ).toBe(1)

    // A second apply of the same batch posts nothing new.
    await applyBackfillBatch(
      { actorUserId: userId, batchId: saved.id, memberId: memberA, tenantId },
      db!
    )
    expect(await postingsOf(memberA)).toEqual(batched)
  })

  it("a share charge fails the batch with the per-row error before migration is finalized", async () => {
    await db!.chargeDefinition.create({
      data: {
        amount: 250,
        code: "SHARE",
        kind: "fixed",
        name: "Monthly share",
        purpose: "member_share",
        tenantId,
      },
    })
    const memberC = await createMember("BF-C")
    const saved = await saveBackfillDraft(
      {
        actorUserId: userId,
        draft: {
          ...draft,
          rows: draft.rows.map((row) => ({
            ...row,
            chargeValues: { ...row.chargeValues, SHARE: 250 },
            loanEvent: undefined,
            loanService: 0,
          })),
        } as never,
        draftInput: {
          endMonth: months.at(-1)!,
          startMonth: months[0]!,
        } as never,
        memberId: memberC,
        tenantId,
      },
      db!
    )

    await expect(
      applyBackfillBatch(
        { actorUserId: userId, batchId: saved.id, memberId: memberC, tenantId },
        db!
      )
    ).rejects.toThrow(
      "Live financial record writes are locked until initial migration is finalized."
    )
    expect(
      await db!.contribution.count({ where: { memberId: memberC, tenantId } })
    ).toBe(0)
  })
})
