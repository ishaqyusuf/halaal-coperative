import { describe, expect, test } from "bun:test"
import { applyBackfillBatch, saveBackfillDraft } from "./backfill"

const validDraftInput = {
  amountLogs: [],
  chargeDefinitions: [],
  defaultShareVersions: [],
  endMonth: "2025-02",
  memberJoinedMonth: "2025-01",
  startMonth: "2025-01",
}

const validDraft = {
  chargeColumns: [],
  profitPeriods: [],
  rows: [
    {
      amount: 0,
      chargeValues: {},
      dividend: 0,
      existingHistoryImpacts: [],
      isEdited: false,
      loanService: 0,
      month: "2025-01",
      monthLabel: "Jan 2025",
      netDeposit: 0,
      pendingLoanPayment: 0,
      share: 0,
      status: "posted",
    },
    {
      amount: 0,
      chargeValues: {},
      dividend: 0,
      existingHistoryImpacts: [],
      isEdited: false,
      loanService: 0,
      month: "2025-02",
      monthLabel: "Feb 2025",
      netDeposit: 0,
      pendingLoanPayment: 0,
      share: 0,
      status: "posted",
    },
  ],
  summary: {},
  warnings: [],
}

function createOpenMigrationStatePrismaModels() {
  return {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "member_migration_in_progress",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

function createBackfillApplyPrismaStub() {
  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        backfillBatch: {
          findFirst: async () => ({
            id: "batch-2",
            memberId: "member-1",
            monthRows: [
              {
                id: "row-2",
                month: 2,
                year: 2025,
              },
            ],
            rangeEnd: new Date("2025-02-01T00:00:00.000Z"),
            rangeStart: new Date("2025-02-01T00:00:00.000Z"),
            status: "generated",
            tenantId: "tenant-1",
          }),
          findMany: async () => [
            {
              id: "batch-1",
              monthRows: [
                {
                  month: 2,
                  year: 2025,
                },
              ],
              status: "applied",
            },
          ],
        },
      }),
  }
}

function createAppliedMonthLedgerPrismaStub() {
  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        appliedBackfillMonth: {
          findMany: async () => [
            {
              month: new Date("2025-03-01T00:00:00.000Z"),
            },
          ],
        },
        backfillBatch: {
          findFirst: async () => ({
            id: "batch-3",
            memberId: "member-1",
            monthRows: [
              {
                id: "row-3",
                month: 3,
                year: 2025,
              },
            ],
            rangeEnd: new Date("2025-03-01T00:00:00.000Z"),
            rangeStart: new Date("2025-03-01T00:00:00.000Z"),
            status: "generated",
            tenantId: "tenant-1",
          }),
          findMany: async () => [],
        },
      }),
  }
}

function createDraftBatchApplyPrismaStub() {
  const contributionDeleteManyCalls: unknown[] = []

  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        backfillBatch: {
          findFirst: async () => ({
            id: "batch-draft",
            memberId: "member-1",
            monthRows: [
              {
                id: "row-jan",
                month: 1,
                year: 2025,
              },
            ],
            rangeEnd: new Date("2025-01-01T00:00:00.000Z"),
            rangeStart: new Date("2025-01-01T00:00:00.000Z"),
            status: "draft",
            tenantId: "tenant-1",
          }),
        },
        contribution: {
          deleteMany: async (input: unknown) => {
            contributionDeleteManyCalls.push(input)
            return input
          },
        },
      }),
    contributionDeleteManyCalls,
  }
}

function createAppliedBatchReplayPrismaStub() {
  const appliedMonthCreateManyCalls: unknown[] = []
  const contributionDeleteManyCalls: unknown[] = []

  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        appliedBackfillMonth: {
          createMany: async (input: unknown) => {
            appliedMonthCreateManyCalls.push(input)
            return input
          },
        },
        backfillBatch: {
          findFirst: async () => ({
            id: "batch-applied",
            memberId: "member-1",
            monthRows: [
              {
                id: "row-jan",
                month: 1,
                year: 2025,
              },
              {
                id: "row-feb",
                month: 2,
                year: 2025,
              },
            ],
            rangeEnd: new Date("2025-02-01T00:00:00.000Z"),
            rangeStart: new Date("2025-01-01T00:00:00.000Z"),
            status: "applied",
            tenantId: "tenant-1",
          }),
        },
        contribution: {
          deleteMany: async (input: unknown) => {
            contributionDeleteManyCalls.push(input)
            return input
          },
        },
      }),
    appliedMonthCreateManyCalls,
    contributionDeleteManyCalls,
  }
}

function createExistingLiveRecordPrismaStub() {
  const contributionDeleteManyCalls: unknown[] = []

  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        appliedBackfillMonth: {
          findMany: async () => [],
        },
        backfillBatch: {
          findFirst: async () => ({
            id: "batch-live-conflict",
            memberId: "member-1",
            monthRows: [
              {
                id: "row-jan",
                month: 1,
                year: 2025,
              },
            ],
            rangeEnd: new Date("2025-01-01T00:00:00.000Z"),
            rangeStart: new Date("2025-01-01T00:00:00.000Z"),
            status: "generated",
            tenantId: "tenant-1",
          }),
          findMany: async () => [],
        },
        chargeApplication: {
          findMany: async () => [],
        },
        contribution: {
          deleteMany: async (input: unknown) => {
            contributionDeleteManyCalls.push(input)
            return input
          },
          findMany: async () => [{ id: "existing-contribution" }],
        },
        ledgerTransaction: {
          findMany: async () => [],
        },
        repayment: {
          findMany: async () => [],
        },
      }),
    contributionDeleteManyCalls,
  }
}

function createAppliedMemberDraftSavePrismaStub() {
  const backfillBatchFindFirstCalls: unknown[] = []
  const backfillBatchCreateCalls: unknown[] = []
  const backfillBatchUpdateCalls: unknown[] = []

  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        appliedBackfillMonth: {
          findMany: async () => [{ id: "applied-month-1" }],
        },
        backfillBatch: {
          create: async (input: unknown) => {
            backfillBatchCreateCalls.push(input)
            return input
          },
          findFirst: async (input: unknown) => {
            backfillBatchFindFirstCalls.push(input)
            return null
          },
          findMany: async () => [],
          update: async (input: unknown) => {
            backfillBatchUpdateCalls.push(input)
            return input
          },
        },
      }),
    backfillBatchCreateCalls,
    backfillBatchFindFirstCalls,
    backfillBatchUpdateCalls,
  }
}

function createLegacyLoanBackfillApplyPrismaStub(monthRows?: any[]) {
  const loanCreates: unknown[] = []
  const loanRequestCreates: unknown[] = []
  const repaymentCreates: unknown[] = []
  const scheduleCreates: any[] = []
  const shareProfitAllocationUpserts: unknown[] = []
  const loanStates = new Map<string, any>()
  const defaultMonthRows = [
    {
      amount: 15000,
      chargeBreakdown: {},
      id: "row-1",
      loanServiceAmount: 10000,
      metadata: {
        loanEvent: {
          durationMonths: 7,
          id: "legacy-loan-1",
          label: "Loan A",
          loanAmount: 120000,
          monthlyLoanServiceAmount: 10000,
          openingOutstandingPrincipalBalance: 65000,
          startMonth: "2025-08",
          topUp: 5000,
        },
      },
      month: 8,
      rowStatus: "posted",
      share: 0,
      year: 2025,
    },
  ]

  const tx = {
    appliedBackfillMonth: {
      createMany: async () => undefined,
      findMany: async () => [],
    },
    auditLog: {
      create: async (input: unknown) => input,
    },
    backfillBatch: {
      findFirst: async () => ({
        id: "batch-legacy-loan",
        memberId: "member-1",
        monthRows: monthRows ?? defaultMonthRows,
        rangeEnd: new Date("2025-08-01T00:00:00.000Z"),
        rangeStart: new Date("2025-08-01T00:00:00.000Z"),
        status: "generated",
        tenantId: "tenant-1",
      }),
      findMany: async () => [],
      update: async (input: unknown) => input,
    },
    chargeApplication: {
      deleteMany: async () => undefined,
      findMany: async () => [],
    },
    chargeDefinition: {
      findMany: async () => [],
    },
    contribution: {
      deleteMany: async () => undefined,
      findMany: async () => [],
    },
    dividendAllocation: {
      findMany: async () => [],
    },
    ledgerAccount: {
      findUnique: async (input: any) => ({
        id: `account-${input.where.tenantId_code.code}`,
      }),
    },
    ledgerEntry: {
      deleteMany: async () => undefined,
    },
    ledgerTransaction: {
      create: async (input: unknown) => input,
      deleteMany: async () => undefined,
      findMany: async () => [],
    },
    loan: {
      create: async (input: any) => {
        loanCreates.push(input)
        const loanState = {
          id: `loan-${loanCreates.length}`,
          ...input.data,
        }
        loanStates.set(loanState.id, loanState)

        return loanState
      },
      findFirst: async (input: any) => {
        if (input.where.id) {
          return loanStates.get(input.where.id) ?? null
        }

        return null
      },
      findMany: async () => [],
      update: async (input: any) => {
        let loanState = loanStates.get(input.where.id)

        if (loanState && input.data.outstandingPrincipal?.decrement) {
          loanState = {
            ...loanState,
            outstandingPrincipal:
              Number(loanState.outstandingPrincipal) -
              Number(input.data.outstandingPrincipal.decrement),
            status: input.data.status,
          }
          loanStates.set(input.where.id, loanState)
        }

        return loanState
      },
    },
    loanApproval: {
      create: async (input: unknown) => input,
    },
    loanProduct: {
      upsert: async () => ({ id: "loan-product-1" }),
    },
    loanRequest: {
      create: async (input: any) => {
        loanRequestCreates.push(input)
        return { id: "loan-request-1", ...input.data }
      },
    },
    member: {
      update: async (input: unknown) => input,
    },
    repayment: {
      create: async (input: any) => {
        repaymentCreates.push(input)
        return { id: "repayment-1", ...input.data }
      },
      deleteMany: async () => undefined,
    },
    repaymentScheduleItem: {
      createMany: async (input: any) => {
        scheduleCreates.push(
          ...input.data.map((item: any, index: number) => ({
            id: `schedule-${scheduleCreates.length + index + 1}`,
            ...item,
          }))
        )
      },
      findMany: async () => scheduleCreates,
      update: async (input: any) => {
        const item = scheduleCreates.find((row) => row.id === input.where.id)
        if (item) Object.assign(item, input.data)

        return item
      },
      updateMany: async () => undefined,
    },
    shareProfitAllocation: {
      upsert: async (input: unknown) => {
        shareProfitAllocationUpserts.push(input)
        return input
      },
    },
  }

  return {
    ...createOpenMigrationStatePrismaModels(),
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback(tx),
    loanCreates,
    loanRequestCreates,
    repaymentCreates,
    scheduleCreates,
    shareProfitAllocationUpserts,
  }
}

describe("apply backfill batch", () => {
  test("blocks applying a different batch over an already-applied member month", async () => {
    await expect(
      applyBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-2",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        createBackfillApplyPrismaStub() as never
      )
    ).rejects.toThrow("Backfill has already been applied for 2025-02")
  })

  test("uses the applied month ledger as the duplicate apply guard", async () => {
    await expect(
      applyBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-3",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        createAppliedMonthLedgerPrismaStub() as never
      )
    ).rejects.toThrow("Backfill has already been applied for 2025-03")
  })

  test("blocks applying a draft batch before generation or approval", async () => {
    const prisma = createDraftBatchApplyPrismaStub()

    await expect(
      applyBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-draft",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("must be generated or approved")
    expect(prisma.contributionDeleteManyCalls).toHaveLength(0)
  })

  test("replay of an already-applied batch backfills applied month markers without reposting", async () => {
    const prisma = createAppliedBatchReplayPrismaStub()

    await applyBackfillBatch(
      {
        actorUserId: "user-1",
        batchId: "batch-applied",
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.appliedMonthCreateManyCalls).toEqual([
      {
        data: [
          {
            appliedByUserId: "user-1",
            batchId: "batch-applied",
            memberId: "member-1",
            month: new Date("2025-01-01T00:00:00.000Z"),
            sourceKey: "backfill:batch-applied:2025-01",
            tenantId: "tenant-1",
          },
          {
            appliedByUserId: "user-1",
            batchId: "batch-applied",
            memberId: "member-1",
            month: new Date("2025-02-01T00:00:00.000Z"),
            sourceKey: "backfill:batch-applied:2025-02",
            tenantId: "tenant-1",
          },
        ],
        skipDuplicates: true,
      },
    ])
    expect(prisma.contributionDeleteManyCalls).toHaveLength(0)
  })

  test("blocks apply when live financial records already exist in the backfill range", async () => {
    const prisma = createExistingLiveRecordPrismaStub()

    await expect(
      applyBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-live-conflict",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Existing live financial records")
    expect(prisma.contributionDeleteManyCalls).toHaveLength(0)
  })

  test("blocks stale draft regeneration after member backfill has been applied", async () => {
    const prisma = createAppliedMemberDraftSavePrismaStub()

    await expect(
      saveBackfillDraft(
        {
          actorUserId: "user-1",
          draft: validDraft as never,
          draftInput: validDraftInput as never,
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")
    expect(prisma.backfillBatchFindFirstCalls).toHaveLength(0)
    expect(prisma.backfillBatchCreateCalls).toHaveLength(0)
    expect(prisma.backfillBatchUpdateCalls).toHaveLength(0)
  })

  test("rejects draft rows outside the declared draft range before persistence", async () => {
    await expect(
      saveBackfillDraft(
        {
          actorUserId: "user-1",
          draft: {
            ...validDraft,
            rows: [
              ...validDraft.rows,
              {
                ...validDraft.rows[0],
                month: "2025-03",
                monthLabel: "Mar 2025",
              },
            ],
          } as never,
          draftInput: validDraftInput as never,
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        {} as never
      )
    ).rejects.toThrow("falls outside the declared 2025-01 to 2025-02 range")
  })

  test("rejects draft rows that do not cover every declared month exactly once", async () => {
    await expect(
      saveBackfillDraft(
        {
          actorUserId: "user-1",
          draft: {
            ...validDraft,
            rows: [validDraft.rows[0]],
          } as never,
          draftInput: validDraftInput as never,
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        {} as never
      )
    ).rejects.toThrow("exactly one row for every month")
  })

  test("creates a principal-only legacy loan from backfill metadata before posting repayments", async () => {
    const prisma = createLegacyLoanBackfillApplyPrismaStub()

    await applyBackfillBatch(
      {
        actorUserId: "user-1",
        batchId: "batch-legacy-loan",
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.loanRequestCreates[0]).toMatchObject({
      data: {
        estimatedMonthlyServicing: 10000,
        purpose: "Loan A",
        requestedAmount: 120000,
        requestedTermMonths: 7,
      },
    })
    expect(prisma.loanCreates[0]).toMatchObject({
      data: {
        outstandingPrincipal: 65000,
        principalAmount: 120000,
        status: "active",
      },
    })
    expect(prisma.scheduleCreates).toHaveLength(7)
    expect(prisma.repaymentCreates[0]).toMatchObject({
      data: {
        amount: 10000,
        loanId: "loan-1",
        reference: "backfill-batch-legacy-loan-2025-8",
      },
    })
  })

  test("posts repayments to the matching materialized legacy loan for each loan event", async () => {
    const prisma = createLegacyLoanBackfillApplyPrismaStub([
      {
        amount: 15000,
        chargeBreakdown: {},
        id: "row-1",
        loanServiceAmount: 10000,
        metadata: {
          loanEvent: {
            durationMonths: 7,
            id: "legacy-loan-1",
            label: "Loan A",
            loanAmount: 120000,
            monthlyLoanServiceAmount: 10000,
            openingOutstandingPrincipalBalance: 65000,
            startMonth: "2025-08",
            topUp: 5000,
          },
        },
        month: 8,
        rowStatus: "posted",
        share: 0,
        year: 2025,
      },
      {
        amount: 26000,
        chargeBreakdown: {},
        id: "row-2",
        loanServiceAmount: 20000,
        metadata: {
          loanEvent: {
            durationMonths: 4,
            id: "legacy-loan-2",
            label: "Loan B",
            loanAmount: 80000,
            monthlyLoanServiceAmount: 20000,
            openingOutstandingPrincipalBalance: 40000,
            startMonth: "2025-09",
            topUp: 6000,
          },
        },
        month: 9,
        rowStatus: "posted",
        share: 0,
        year: 2025,
      },
    ])

    await applyBackfillBatch(
      {
        actorUserId: "user-1",
        batchId: "batch-legacy-loan",
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.loanCreates).toHaveLength(2)
    expect(prisma.loanRequestCreates).toHaveLength(2)
    expect(prisma.repaymentCreates).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 10000,
          loanId: "loan-1",
        }),
      }),
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 20000,
          loanId: "loan-2",
        }),
      }),
    ])
  })

  test("publishes migration profit adjustments as share profit allocations during apply", async () => {
    const prisma = createLegacyLoanBackfillApplyPrismaStub([
      {
        amount: 0,
        chargeBreakdown: {},
        dividend: 8500,
        id: "row-profit",
        loanServiceAmount: 0,
        metadata: {
          dividendLabel: "Retail pool profit",
          dividendProfitEntryId: "profit-entry-1",
          dividendSharePercentage: 12.5,
        },
        month: 4,
        rowStatus: "posted",
        share: 0,
        year: 2025,
      },
    ])

    await applyBackfillBatch(
      {
        actorUserId: "user-1",
        batchId: "batch-legacy-loan",
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.shareProfitAllocationUpserts).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          allocatedProfitAmount: 8500,
          memberId: "member-1",
          profitEntryId: "profit-entry-1",
          sharePercentage: 12.5,
          status: "published",
          tenantId: "tenant-1",
        }),
        update: expect.objectContaining({
          allocatedProfitAmount: 8500,
          sharePercentage: 12.5,
          status: "published",
        }),
        where: {
          profitEntryId_memberId: {
            memberId: "member-1",
            profitEntryId: "profit-entry-1",
          },
        },
      }),
    ])
  })
})
