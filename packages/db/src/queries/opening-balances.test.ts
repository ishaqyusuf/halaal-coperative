import { describe, expect, test } from "bun:test"
import {
  applyMemberOpeningBalance,
  createMemberOpeningBalance,
  listMemberOpeningBalances,
  reviewMemberOpeningBalance,
  reverseMemberOpeningBalance,
} from "./opening-balances"

function openingBalanceRow(overrides: Record<string, unknown> = {}) {
  return {
    activeFinancingOutstanding: 75000,
    appliedLoanId: null,
    appliedProcurementRequestId: null,
    commitmentSavingsBalance: 120000,
    createdAt: new Date("2026-07-09T10:00:00.000Z"),
    createdByUserId: "user-1",
    id: "opening-1",
    member: {
      fullName: "Aisha Bello",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    notes: "Current book position",
    openingDate: new Date("2026-07-01T00:00:00.000Z"),
    procurementOutstanding: 25000,
    reviewedAt: null,
    reviewedByUserId: null,
    reviewNotes: null,
    reversedAt: null,
    reversedByUserId: null,
    reversalNotes: null,
    shareCapitalBalance: 30000,
    shareUnits: 3,
    sourceDocumentName: "ledger-scan.pdf",
    sourceDocumentUrl: "https://example.com/ledger-scan.pdf",
    specialSavingsBalance: 15000,
    status: "pending_review",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-07-09T10:00:00.000Z"),
    ...overrides,
  }
}

function createOpeningBalancePrismaStub({
  appliedLedger = false,
  loanRepaymentAmount = 0,
  loanSchedulePaidAmount = 0,
  migrationStatus = "member_migration_in_progress",
  openingRows = [openingBalanceRow()],
  procurementSchedulePaidAmount = 0,
}: {
  appliedLedger?: boolean
  loanRepaymentAmount?: number
  loanSchedulePaidAmount?: number
  migrationStatus?: string
  openingRows?: Record<string, unknown>[]
  procurementSchedulePaidAmount?: number
} = {}) {
  const auditLogCreates: Record<string, unknown>[] = []
  const ledgerTransactionCreates: Record<string, unknown>[] = []
  const loanApprovalCreates: Record<string, unknown>[] = []
  const loanCreates: Record<string, unknown>[] = []
  const loanProductUpserts: Record<string, unknown>[] = []
  const loanRequestCreates: Record<string, unknown>[] = []
  const loanUpdates: Record<string, unknown>[] = []
  const memberShareLedgerEntryCreates: Record<string, unknown>[] = []
  const memberUpdates: Record<string, unknown>[] = []
  const openingBalanceCreates: Record<string, unknown>[] = []
  const openingBalanceUpdates: Record<string, unknown>[] = []
  const procurementRequestCreates: Record<string, unknown>[] = []
  const procurementRequestUpdates: Record<string, unknown>[] = []
  const procurementScheduleCreates: Record<string, unknown>[] = []
  const procurementScheduleUpdates: Record<string, unknown>[] = []
  const repaymentScheduleCreates: Record<string, unknown>[] = []
  const repaymentScheduleUpdates: Record<string, unknown>[] = []

  const tx = {
    appliedBackfillMonth: {
      findMany: async (input: any) => {
        if (!appliedLedger) return []

        return input?.where?.memberId
          ? [{ id: "applied-month-1" }]
          : [
              {
                memberId: "member-1",
                month: new Date("2026-07-01T00:00:00.000Z"),
              },
            ]
      },
    },
    auditLog: {
      count: async () => 1,
      create: async (input: Record<string, unknown>) => {
        auditLogCreates.push(input)
        return input
      },
    },
    backfillBatch: {
      count: async () => (appliedLedger ? 1 : 0),
      findMany: async (input: any) =>
        appliedLedger && input?.where?.memberId
          ? [{ id: "batch-1", memberId: input.where.memberId }]
          : [],
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    ledgerAccount: {
      createMany: async () => ({ count: 7 }),
      findMany: async () => [
        { code: "1000", id: "ledger-account-savings" },
        { code: "1100", id: "ledger-account-loan-receivable" },
        { code: "2000", id: "ledger-account-cash" },
        { code: "3000", id: "ledger-account-charge-income" },
        { code: "3100", id: "ledger-account-levy-income" },
        { code: "3200", id: "ledger-account-share-capital" },
        { code: "4000", id: "ledger-account-equity" },
      ],
    },
    ledgerTransaction: {
      create: async (input: any) => {
        ledgerTransactionCreates.push(input)
        return {
          id: "ledger-transaction-1",
          ...input.data,
        }
      },
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loanApproval: {
      create: async (input: any) => {
        loanApprovalCreates.push(input)
        return {
          id: "loan-approval-opening-1",
          ...input.data,
        }
      },
    },
    loanProduct: {
      upsert: async (input: any) => {
        loanProductUpserts.push(input)
        return {
          id: "loan-product-opening-1",
          ...input.create,
        }
      },
    },
    loanRequest: {
      create: async (input: any) => {
        loanRequestCreates.push(input)
        return {
          id: "loan-request-opening-1",
          ...input.data,
        }
      },
    },
    loan: {
      count: async () => 0,
      create: async (input: any) => {
        loanCreates.push(input)
        return {
          id: "loan-opening-1",
          ...input.data,
        }
      },
      findFirst: async (input: any) =>
        input?.where?.id === "loan-opening-1"
          ? {
              id: "loan-opening-1",
              memberId: "member-1",
              repaymentScheduleItems: [
                {
                  amountPaid: loanSchedulePaidAmount,
                  id: "repayment-schedule-opening-1",
                },
              ],
              repayments:
                loanRepaymentAmount > 0
                  ? [
                      {
                        amount: loanRepaymentAmount,
                        id: "repayment-opening-1",
                      },
                    ]
                  : [],
              tenantId: "tenant-1",
            }
          : null,
      update: async (input: any) => {
        loanUpdates.push(input)
        return input
      },
    },
    member: {
      findFirst: async (input: any) =>
        input?.where?.tenantId === "tenant-1" &&
        input?.where?.id === "member-1"
          ? { id: "member-1", totalSavingsSnapshot: 250000 }
          : null,
      findMany: async () => [
        {
          id: "member-1",
          joinedAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
      update: async (input: any) => {
        memberUpdates.push(input)
        return input
      },
    },
    memberOpeningBalance: {
      create: async (input: any) => {
        openingBalanceCreates.push(input)
        return openingBalanceRow(input.data)
      },
      findFirst: async (input: any) =>
        openingRows.find((row: any) => {
          if (input?.where?.tenantId && row.tenantId !== input.where.tenantId) {
            return false
          }

          if (input?.where?.memberId && row.memberId !== input.where.memberId) {
            return false
          }

          if (input?.where?.status && row.status !== input.where.status) {
            return false
          }

          if (input?.where?.id) {
            if (
              typeof input.where.id === "object" &&
              input.where.id?.not === row.id
            ) {
              return false
            }

            if (typeof input.where.id === "string" && row.id !== input.where.id) {
              return false
            }
          }

          return true
        }) ?? null,
      findMany: async (input: any) =>
        openingRows.filter((row: any) => {
          if (input?.where?.tenantId && row.tenantId !== input.where.tenantId) {
            return false
          }

          if (input?.where?.memberId && row.memberId !== input.where.memberId) {
            return false
          }

          if (input?.where?.status && row.status !== input.where.status) {
            return false
          }

          return true
        }),
      update: async (input: any) => {
        openingBalanceUpdates.push(input)
        return openingBalanceRow({
          ...openingRows[0],
          ...input.data,
        })
      },
    },
    memberShareLedgerEntry: {
      create: async (input: any) => {
        memberShareLedgerEntryCreates.push(input)
        return {
          id: "share-ledger-entry-1",
          ...input.data,
        }
      },
    },
    repaymentScheduleItem: {
      create: async (input: any) => {
        repaymentScheduleCreates.push(input)
        return {
          id: "repayment-schedule-opening-1",
          ...input.data,
        }
      },
      updateMany: async (input: any) => {
        repaymentScheduleUpdates.push(input)
        return {
          count: 1,
        }
      },
    },
    procurementRepaymentScheduleItem: {
      create: async (input: any) => {
        procurementScheduleCreates.push(input)
        return {
          id: "procurement-schedule-1",
          ...input.data,
        }
      },
      updateMany: async (input: any) => {
        procurementScheduleUpdates.push(input)
        return {
          count: 1,
        }
      },
    },
    procurementRequest: {
      create: async (input: any) => {
        procurementRequestCreates.push(input)
        return {
          id: "procurement-opening-1",
          ...input.data,
        }
      },
      findFirst: async (input: any) =>
        input?.where?.id === "procurement-opening-1"
          ? {
              id: "procurement-opening-1",
              memberId: "member-1",
              repaymentScheduleItems: [
                {
                  id: "procurement-schedule-1",
                  paidAmount: procurementSchedulePaidAmount,
                },
              ],
              tenantId: "tenant-1",
            }
          : null,
      update: async (input: any) => {
        procurementRequestUpdates.push(input)
        return input
      },
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: migrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: null,
        startDate: new Date("2026-07-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        procurementAllowsCommitmentReductionDuringPayback: false,
        procurementMaximumPaybackMonths: 12,
        shareConfigurationMode: "monthly_history",
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    user: {
      findFirst: async (input: any) =>
        input?.where?.id === "user-1" ? { id: "user-1" } : null,
    },
  }

  return {
    ...tx,
    $transaction: async (
      callback: (transaction: typeof tx) => Promise<unknown>
    ) => callback(tx),
    auditLogCreates,
    ledgerTransactionCreates,
    loanApprovalCreates,
    loanCreates,
    loanProductUpserts,
    loanRequestCreates,
    loanUpdates,
    memberShareLedgerEntryCreates,
    memberUpdates,
    openingBalanceCreates,
    openingBalanceUpdates,
    procurementRequestCreates,
    procurementRequestUpdates,
    procurementScheduleCreates,
    procurementScheduleUpdates,
    repaymentScheduleCreates,
    repaymentScheduleUpdates,
  }
}

describe("member opening balances", () => {
  test("creates staged brought-forward balances with audit evidence", async () => {
    const prisma = createOpeningBalancePrismaStub()

    const openingBalance = await createMemberOpeningBalance(
      {
        actorUserId: "user-1",
        activeFinancingOutstanding: 75000,
        commitmentSavingsBalance: 120000,
        memberId: "member-1",
        notes: "Current book position",
        openingDate: new Date("2026-07-15T18:30:00.000Z"),
        procurementOutstanding: 25000,
        shareCapitalBalance: 30000,
        shareUnits: 3,
        sourceDocumentName: "ledger-scan.pdf",
        sourceDocumentUrl: "https://example.com/ledger-scan.pdf",
        specialSavingsBalance: 15000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      activeFinancingOutstanding: 75000,
      commitmentSavingsBalance: 120000,
      memberId: "member-1",
      procurementOutstanding: 25000,
      shareCapitalBalance: 30000,
      shareUnits: 3,
      specialSavingsBalance: 15000,
      status: "pending_review",
    })
    expect(prisma.openingBalanceCreates[0]).toMatchObject({
      data: {
        activeFinancingOutstanding: 75000,
        commitmentSavingsBalance: 120000,
        createdByUserId: "user-1",
        memberId: "member-1",
        procurementOutstanding: 25000,
        shareCapitalBalance: 30000,
        shareUnits: 3,
        specialSavingsBalance: 15000,
        tenantId: "tenant-1",
      },
    })
    expect((prisma.openingBalanceCreates[0] as any).data.openingDate).toEqual(
      new Date("2026-07-15T00:00:00.000Z")
    )
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.opening_balance.created",
        actorUserId: "user-1",
        entityId: "opening-1",
        entityType: "MemberOpeningBalance",
        metadata: {
          activeFinancingOutstanding: 75000,
          commitmentSavingsBalance: 120000,
          hasSourceDocument: true,
          memberId: "member-1",
          procurementOutstanding: 25000,
          shareCapitalBalance: 30000,
          shareUnits: 3,
          specialSavingsBalance: 15000,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("lists opening balances within tenant, member, and status filters", async () => {
    const findManyCalls: Record<string, unknown>[] = []
    const fromDate = new Date("2026-07-01T00:00:00.000Z")
    const toDate = new Date("2026-07-31T23:59:59.999Z")
    const rows = await listMemberOpeningBalances(
      {
        fromDate,
        limit: 500,
        memberId: "member-1",
        status: "pending_review",
        tenantId: "tenant-1",
        toDate,
      },
      {
        memberOpeningBalance: {
          findMany: async (input: Record<string, unknown>) => {
            findManyCalls.push(input)
            return [openingBalanceRow({ id: "opening-1", tenantId: "tenant-1" })]
          },
        },
      } as never
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: "opening-1",
      memberId: "member-1",
      status: "pending_review",
    })
    expect(findManyCalls[0]).toMatchObject({
      take: 500,
      where: {
        memberId: "member-1",
        openingDate: {
          gte: fromDate,
          lte: toDate,
        },
        status: "pending_review",
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects negative opening balances", async () => {
    const prisma = createOpeningBalancePrismaStub()

    await expect(
      createMemberOpeningBalance(
        {
          actorUserId: "user-1",
          commitmentSavingsBalance: -1,
          memberId: "member-1",
          openingDate: new Date("2026-07-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Commitment savings balance cannot be negative")

    expect(prisma.openingBalanceCreates).toHaveLength(0)
  })

  test("blocks opening balance edits after member ledger application", async () => {
    const prisma = createOpeningBalancePrismaStub({ appliedLedger: true })

    await expect(
      createMemberOpeningBalance(
        {
          actorUserId: "user-1",
          commitmentSavingsBalance: 1000,
          memberId: "member-1",
          openingDate: new Date("2026-07-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")

    expect(prisma.openingBalanceCreates).toHaveLength(0)
  })

  test("blocks opening balance edits after an opening balance is applied", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [openingBalanceRow({ status: "applied" })],
    })

    await expect(
      createMemberOpeningBalance(
        {
          actorUserId: "user-1",
          commitmentSavingsBalance: 1000,
          memberId: "member-1",
          openingDate: new Date("2026-08-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")

    expect(prisma.openingBalanceCreates).toHaveLength(0)
  })

  test("reviews pending opening balances with audit evidence", async () => {
    const prisma = createOpeningBalancePrismaStub()

    const openingBalance = await reviewMemberOpeningBalance(
      {
        actorUserId: "user-1",
        decision: "approved",
        openingBalanceId: "opening-1",
        reviewNotes: "Matches signed opening ledger.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      reviewedByUserId: "user-1",
      reviewNotes: "Matches signed opening ledger.",
      status: "approved",
    })
    expect(prisma.openingBalanceUpdates[0]).toMatchObject({
      data: {
        reviewedByUserId: "user-1",
        reviewNotes: "Matches signed opening ledger.",
        status: "approved",
      },
      where: {
        id: "opening-1",
      },
    })
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.opening_balance.reviewed",
        actorUserId: "user-1",
        entityId: "opening-1",
        entityType: "MemberOpeningBalance",
        metadata: {
          memberId: "member-1",
          nextStatus: "approved",
          previousStatus: "pending_review",
          reviewNotes: "Matches signed opening ledger.",
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks reviewing already reviewed opening balances", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [openingBalanceRow({ status: "approved" })],
    })

    await expect(
      reviewMemberOpeningBalance(
        {
          actorUserId: "user-1",
          decision: "rejected",
          openingBalanceId: "opening-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Only pending opening balances can be reviewed")

    expect(prisma.openingBalanceUpdates).toHaveLength(0)
  })

  test("applies approved opening savings and share capital with audit evidence", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 0,
          procurementOutstanding: 0,
          status: "approved",
        }),
      ],
    })

    const openingBalance = await applyMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      appliedByUserId: "user-1",
      status: "applied",
    })
    expect(prisma.ledgerTransactionCreates[0]).toMatchObject({
      data: {
        memberId: "member-1",
        narration: "Brought-forward opening savings balance",
        reference: "opening-balance:opening-1:savings",
        tenantId: "tenant-1",
        transactionType: "adjustment",
      },
    })
    expect((prisma.ledgerTransactionCreates[0] as any).data.entries.create).toEqual(
      [
        {
          amount: 135000,
          direction: "debit",
          ledgerAccountId: "ledger-account-equity",
          tenantId: "tenant-1",
        },
        {
          amount: 135000,
          direction: "credit",
          ledgerAccountId: "ledger-account-savings",
          tenantId: "tenant-1",
        },
      ]
    )
    expect(prisma.memberUpdates[0]).toMatchObject({
      data: {
        totalSavingsSnapshot: {
          increment: 135000,
        },
      },
      where: {
        id: "member-1",
      },
    })
    expect(prisma.memberShareLedgerEntryCreates[0]).toMatchObject({
      data: {
        amount: 30000,
        memberId: "member-1",
        notes: "Brought-forward opening share capital",
        sourceId: "opening-1",
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.openingBalanceUpdates[0]).toMatchObject({
      data: {
        appliedByUserId: "user-1",
        status: "applied",
      },
      where: {
        id: "opening-1",
      },
    })
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "migration.opening_balance.applied",
        actorUserId: "user-1",
        entityId: "opening-1",
        metadata: {
          savingsLedgerTransactionId: "ledger-transaction-1",
          savingsTotal: 135000,
          shareCapitalBalance: 30000,
          shareLedgerEntryId: "share-ledger-entry-1",
        },
      },
    })
  })

  test("applies approved opening financing as an active principal obligation", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 75000,
          procurementOutstanding: 0,
          status: "approved",
        }),
      ],
    })

    const openingBalance = await applyMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      appliedByUserId: "user-1",
      appliedLoanId: "loan-opening-1",
      status: "applied",
    })
    expect(prisma.loanProductUpserts[0]).toMatchObject({
      create: {
        isActive: true,
        loanType: "normal",
        maxSavingsMultiple: 2,
        name: "Brought-forward opening financing",
        tenantId: "tenant-1",
        termMonths: 1,
      },
      where: {
        tenantId_name: {
          name: "Brought-forward opening financing",
          tenantId: "tenant-1",
        },
      },
    })
    expect(prisma.loanRequestCreates[0]).toMatchObject({
      data: {
        availablePoolSnapshot: 0,
        createdByUserId: "user-1",
        eligibleAmountSnapshot: 0,
        estimatedMonthlyServicing: 75000,
        loanProductId: "loan-product-opening-1",
        memberId: "member-1",
        purpose: "Brought-forward active financing balance",
        requestedAmount: 75000,
        requestedTermMonths: 1,
        status: "approved",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.loanApprovalCreates[0]).toMatchObject({
      data: {
        action: "approved",
        actorUserId: "user-1",
        loanRequestId: "loan-request-opening-1",
        notes: "Approved during brought-forward opening balance apply.",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.loanCreates[0]).toMatchObject({
      data: {
        estimatedMonthlyServicing: 75000,
        firstRepaymentDueAt: new Date("2026-07-01T00:00:00.000Z"),
        loanProductId: "loan-product-opening-1",
        loanRequestId: "loan-request-opening-1",
        memberId: "member-1",
        outstandingPrincipal: 75000,
        principalAmount: 75000,
        status: "active",
        tenantId: "tenant-1",
        termMonths: 1,
      },
    })
    expect(prisma.repaymentScheduleCreates[0]).toMatchObject({
      data: {
        amountPaid: 0,
        dueAt: new Date("2026-07-01T00:00:00.000Z"),
        installmentNumber: 1,
        loanId: "loan-opening-1",
        principalDue: 75000,
        status: "pending",
        tenantId: "tenant-1",
        totalDue: 75000,
      },
    })
    expect(prisma.openingBalanceUpdates[0]).toMatchObject({
      data: {
        appliedByUserId: "user-1",
        appliedLoanId: "loan-opening-1",
        status: "applied",
      },
    })
    expect(prisma.auditLogCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.financing_posted",
            entityId: "loan-opening-1",
            entityType: "Loan",
            metadata: expect.objectContaining({
              amount: 75000,
              loanRequestId: "loan-request-opening-1",
              openingBalanceId: "opening-1",
              scheduleItemId: "repayment-schedule-opening-1",
            }),
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.applied",
            metadata: expect.objectContaining({
              activeFinancingOutstanding: 75000,
              loanId: "loan-opening-1",
              loanRequestId: "loan-request-opening-1",
              loanScheduleItemId: "repayment-schedule-opening-1",
            }),
          }),
        }),
      ])
    )
  })

  test("applies approved opening procurement as an active repayment obligation", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 0,
          procurementOutstanding: 25000,
          status: "approved",
        }),
      ],
    })

    const openingBalance = await applyMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      appliedByUserId: "user-1",
      appliedProcurementRequestId: "procurement-opening-1",
      status: "applied",
    })
    expect(prisma.procurementRequestCreates[0]).toMatchObject({
      data: {
        approvedCost: 25000,
        approvedMonthlyRepayment: 25000,
        approvedRepaymentMonths: 1,
        createdByUserId: "user-1",
        itemName: "Brought-forward procurement balance",
        memberId: "member-1",
        purchaseReference: "opening-balance:opening-1:procurement",
        requestedCost: 25000,
        requestedRepaymentMonths: 1,
        status: "active",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.procurementScheduleCreates[0]).toMatchObject({
      data: {
        amount: 25000,
        dueDate: new Date("2026-07-01T00:00:00.000Z"),
        installmentNumber: 1,
        memberId: "member-1",
        procurementRequestId: "procurement-opening-1",
        status: "pending",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.openingBalanceUpdates[0]).toMatchObject({
      data: {
        appliedByUserId: "user-1",
        appliedProcurementRequestId: "procurement-opening-1",
        status: "applied",
      },
    })
    expect(prisma.auditLogCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.procurement_posted",
            entityId: "procurement-opening-1",
            entityType: "ProcurementRequest",
            metadata: expect.objectContaining({
              amount: 25000,
              openingBalanceId: "opening-1",
              scheduleItemId: "procurement-schedule-1",
            }),
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.applied",
            metadata: expect.objectContaining({
              procurementOutstanding: 25000,
              procurementRequestId: "procurement-opening-1",
              procurementScheduleItemId: "procurement-schedule-1",
            }),
          }),
        }),
      ])
    )
  })

  test("reverses applied opening savings and share capital with audit evidence", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 0,
          appliedAt: new Date("2026-07-09T11:00:00.000Z"),
          appliedByUserId: "user-1",
          procurementOutstanding: 0,
          status: "applied",
        }),
      ],
    })

    const openingBalance = await reverseMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        reversalNotes: "Corrected imported opening ledger.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      reversalNotes: "Corrected imported opening ledger.",
      reversedByUserId: "user-1",
      status: "reversed",
    })
    expect(prisma.ledgerTransactionCreates[0]).toMatchObject({
      data: {
        memberId: "member-1",
        narration: "Reverse brought-forward opening savings balance",
        reference: "opening-balance:opening-1:savings-reversal",
        tenantId: "tenant-1",
        transactionType: "adjustment",
      },
    })
    expect((prisma.ledgerTransactionCreates[0] as any).data.entries.create).toEqual(
      [
        {
          amount: 135000,
          direction: "debit",
          ledgerAccountId: "ledger-account-savings",
          tenantId: "tenant-1",
        },
        {
          amount: 135000,
          direction: "credit",
          ledgerAccountId: "ledger-account-equity",
          tenantId: "tenant-1",
        },
      ]
    )
    expect(prisma.memberUpdates[0]).toMatchObject({
      data: {
        totalSavingsSnapshot: {
          decrement: 135000,
        },
      },
      where: {
        id: "member-1",
      },
    })
    expect(prisma.memberShareLedgerEntryCreates[0]).toMatchObject({
      data: {
        amount: -30000,
        memberId: "member-1",
        notes: "Reverse brought-forward opening share capital",
        sourceId: "opening-1",
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.openingBalanceUpdates[0]).toMatchObject({
      data: {
        reversalNotes: "Corrected imported opening ledger.",
        reversedByUserId: "user-1",
        status: "reversed",
      },
      where: {
        id: "opening-1",
      },
    })
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "migration.opening_balance.reversed",
        actorUserId: "user-1",
        entityId: "opening-1",
        metadata: {
          reversalNotes: "Corrected imported opening ledger.",
          savingsReversalLedgerTransactionId: "ledger-transaction-1",
          savingsTotal: 135000,
          shareCapitalBalance: 30000,
          shareReversalLedgerEntryId: "share-ledger-entry-1",
        },
      },
    })
  })

  test("reverses linked opening financing obligation when no repayments exist", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 75000,
          appliedAt: new Date("2026-07-09T11:00:00.000Z"),
          appliedByUserId: "user-1",
          appliedLoanId: "loan-opening-1",
          procurementOutstanding: 0,
          status: "applied",
        }),
      ],
    })

    const openingBalance = await reverseMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        reversalNotes: "Corrected imported opening ledger.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      status: "reversed",
    })
    expect(prisma.repaymentScheduleUpdates[0]).toMatchObject({
      data: {
        status: "waived",
      },
      where: {
        loanId: "loan-opening-1",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.loanUpdates[0]).toMatchObject({
      data: {
        outstandingPrincipal: 0,
        status: "completed",
      },
      where: {
        id: "loan-opening-1",
      },
    })
    expect(prisma.auditLogCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.financing_reversed",
            entityId: "loan-opening-1",
            metadata: expect.objectContaining({
              openingBalanceId: "opening-1",
              reversalNotes: "Corrected imported opening ledger.",
            }),
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.reversed",
            metadata: expect.objectContaining({
              financingReversed: true,
              loanId: "loan-opening-1",
            }),
          }),
        }),
      ])
    )
  })

  test("blocks reversal when linked opening financing has repayment activity", async () => {
    const prisma = createOpeningBalancePrismaStub({
      loanRepaymentAmount: 1000,
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 75000,
          appliedAt: new Date("2026-07-09T11:00:00.000Z"),
          appliedByUserId: "user-1",
          appliedLoanId: "loan-opening-1",
          procurementOutstanding: 0,
          status: "applied",
        }),
      ],
    })

    await expect(
      reverseMemberOpeningBalance(
        {
          actorUserId: "user-1",
          openingBalanceId: "opening-1",
          reversalNotes: "Corrected imported opening ledger.",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already has repayment activity")

    expect(prisma.loanUpdates).toHaveLength(0)
    expect(prisma.repaymentScheduleUpdates).toHaveLength(0)
    expect(prisma.openingBalanceUpdates).toHaveLength(0)
  })

  test("reverses linked opening procurement obligation when no repayments exist", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 0,
          appliedAt: new Date("2026-07-09T11:00:00.000Z"),
          appliedByUserId: "user-1",
          appliedProcurementRequestId: "procurement-opening-1",
          procurementOutstanding: 25000,
          status: "applied",
        }),
      ],
    })

    const openingBalance = await reverseMemberOpeningBalance(
      {
        actorUserId: "user-1",
        openingBalanceId: "opening-1",
        reversalNotes: "Corrected imported opening ledger.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(openingBalance).toMatchObject({
      status: "reversed",
    })
    expect(prisma.procurementScheduleUpdates[0]).toMatchObject({
      data: {
        status: "waived",
      },
      where: {
        procurementRequestId: "procurement-opening-1",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.procurementRequestUpdates[0]).toMatchObject({
      data: {
        purchaseNotes:
          "Reversed from opening balance: Corrected imported opening ledger.",
        status: "cancelled",
      },
      where: {
        id: "procurement-opening-1",
      },
    })
    expect(prisma.auditLogCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.procurement_reversed",
            entityId: "procurement-opening-1",
            metadata: expect.objectContaining({
              openingBalanceId: "opening-1",
              reversalNotes: "Corrected imported opening ledger.",
            }),
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            action: "migration.opening_balance.reversed",
            metadata: expect.objectContaining({
              procurementRequestId: "procurement-opening-1",
              procurementReversed: true,
            }),
          }),
        }),
      ])
    )
  })

  test("blocks reversal when linked opening procurement has repayment activity", async () => {
    const prisma = createOpeningBalancePrismaStub({
      openingRows: [
        openingBalanceRow({
          activeFinancingOutstanding: 0,
          appliedAt: new Date("2026-07-09T11:00:00.000Z"),
          appliedByUserId: "user-1",
          appliedProcurementRequestId: "procurement-opening-1",
          procurementOutstanding: 25000,
          status: "applied",
        }),
      ],
      procurementSchedulePaidAmount: 1000,
    })

    await expect(
      reverseMemberOpeningBalance(
        {
          actorUserId: "user-1",
          openingBalanceId: "opening-1",
          reversalNotes: "Corrected imported opening ledger.",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already has repayment activity")

    expect(prisma.procurementRequestUpdates).toHaveLength(0)
    expect(prisma.procurementScheduleUpdates).toHaveLength(0)
    expect(prisma.openingBalanceUpdates).toHaveLength(0)
  })
})
