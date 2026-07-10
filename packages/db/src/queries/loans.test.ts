import { describe, expect, test } from "bun:test"
import {
  disburseLoan,
  listMemberLoanGuarantorApprovals,
  postRepayment,
  reviewLoanGuarantorApproval,
  reviewLoanRequest,
  respondMemberLoanGuarantorApproval,
  submitLoanRequest,
} from "./loans"

function createLockedLoanPrismaStub() {
  const ledgerLookups: unknown[] = []
  const memberLookups: unknown[] = []
  const loanLookups: unknown[] = []

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
      count: async () => 0,
    },
    ledgerAccount: {
      findUnique: async (input: unknown) => {
        ledgerLookups.push(input)
        return null
      },
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
      findFirst: async (input: unknown) => {
        loanLookups.push(input)
        return null
      },
    },
    loanProduct: {
      findFirst: async () => null,
    },
    member: {
      findFirst: async (input: unknown) => {
        memberLookups.push(input)
        return null
      },
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      count: async () => 0,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "historical_setup_in_progress",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => null,
    },
    tenantShareStructureVersion: {
      count: async () => 0,
    },
    ledgerLookups,
    loanLookups,
    memberLookups,
  }
}

function createLiveLoanRequestPrismaStub(input?: {
  activeFinancingCount?: number
  contributions?: Array<{
    amount: number
    committedAmount?: number | null
    extraSavingsAmount?: number | null
  }>
  existingCycle?: { id: string; status: "closed" | "draft" | "open" | "paused" } | null
  existingLoanRequests?: Array<{
    amount: number
    loanType: "normal" | "quick"
    status:
      | "approved"
      | "cancelled"
      | "draft"
      | "expired"
      | "rejected"
      | "submitted"
      | "under_review"
  }>
  guarantorMembers?: Array<{
    email?: string | null
    fullName: string
    id: string
    memberNumber: string
  }>
  loanType?: "normal" | "quick"
  policyOverrides?: Record<string, unknown>
}) {
  const chargeApplicationCreates: any[] = []
  const loanGuarantorApprovalCreates: any[] = []
  const loanRequestCreates: any[] = []
  const existingCycle =
    input && "existingCycle" in input
      ? input.existingCycle
      : {
    id: "cycle-1",
    normalBudgetAmount: 70000,
    normalAllocationPercentage: 70,
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    projectedCommitmentAmount: 100000,
    quickBudgetAmount: 30000,
    quickAllocationPercentage: 30,
    receivedContributionAmount: 100000,
    reserveBufferAmount: 0,
    status: "open" as const,
    totalCapacityAmount: 100000,
  }

  const tx = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => input,
    },
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeApplication: {
      create: async (input: any) => {
        chargeApplicationCreates.push(input)
        return {
          id: `charge-application-${chargeApplicationCreates.length}`,
          ...input.data,
        }
      },
      findFirst: async () => null,
    },
    chargeDefinition: {
      findFirst: async () => ({
        id: "loan-charge-1",
        isMonthlyLevy: false,
        name: "Loan application fee",
        purpose: "loan_fee",
      }),
      findMany: async () => [
        {
          appliesToLoanRequests: true,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          id: "loan-charge-1",
          isActive: true,
          name: "Loan application fee",
          purpose: "loan_fee",
          versions: [
            {
              amount: 2500,
              chargeValueType: "fixed_amount",
              createdAt: new Date("2025-01-01T00:00:00.000Z"),
              effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
              kind: "fixed",
            },
          ],
        },
      ],
    },
    ledgerAccount: {
      findUnique: async (input: any) => ({
        id: `ledger-${input.where.tenantId_code.code}`,
      }),
    },
    ledgerTransaction: {
      create: async (input: unknown) => input,
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    financingCycle: {
      findUnique: async () => existingCycle,
    },
    loanApproval: {
      create: async (input: unknown) => input,
    },
    loanGuarantorApproval: {
      create: async (input: any) => {
        loanGuarantorApprovalCreates.push(input)
        return {
          id: `guarantor-approval-${loanGuarantorApprovalCreates.length}`,
          ...input.data,
        }
      },
    },
    loan: {
      count: async (args: any) =>
        args?.where?.memberId ? input?.activeFinancingCount ?? 0 : 0,
      findMany: async () => [],
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loanRequest: {
      create: async (input: any) => {
        loanRequestCreates.push(input)
        return {
          id: "loan-request-1",
          ...input.data,
        }
      },
      findMany: async () =>
        (input?.existingLoanRequests ?? []).map((request) => ({
          requestedAmount: request.amount,
          status: request.status,
          loanProduct: {
            loanType: request.loanType,
          },
        })),
    },
    member: {
      findMany: async () => [],
      update: async (input: unknown) => input,
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }

  return {
    ...createLockedLoanPrismaStub(),
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    chargeApplicationCreates,
    contribution: {
      aggregate: async () => ({ _sum: { amount: 250000 } }),
      findMany: async () =>
        input?.contributions?.map((contribution) => ({
          amount: contribution.amount,
          committedAmount: contribution.committedAmount ?? null,
          extraSavingsAmount: contribution.extraSavingsAmount ?? 0,
        })) ?? [],
    },
    contributionPlan: {
      aggregate: async () => ({ _sum: { amount: 100000 } }),
    },
    financingCycle: {
      findUnique: async () => existingCycle,
    },
    loan: {
      aggregate: async () => ({ _sum: { outstandingPrincipal: 0 } }),
      count: async (args: any) =>
        args?.where?.memberId ? input?.activeFinancingCount ?? 0 : 0,
      findMany: async () => [],
    },
    loanGuarantorApprovalCreates,
    loanProduct: {
      findFirst: async () => ({
        id: "product-1",
        isActive: true,
        loanType: input?.loanType ?? "quick",
        maxSavingsMultiple: 2,
        termMonths: 12,
      }),
    },
    loanRequest: {
      findMany: async () =>
        (input?.existingLoanRequests ?? []).map((request) => ({
          requestedAmount: request.amount,
          status: request.status,
          loanProduct: {
            loanType: request.loanType,
          },
        })),
    },
    loanRequestCreates,
    member: {
      count: async () => 1,
      findFirst: async () => ({
        fullName: "Aisha Member",
        id: "member-1",
        memberNumber: "M-001",
        totalSavingsSnapshot: 100000,
      }),
      findMany: async (args: any) =>
        args?.where?.id?.in ? input?.guarantorMembers ?? [] : [],
    },
    repaymentScheduleItem: {
      count: async () => 0,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        activeFinancingBlocksEmergency: true,
        loanEligibilityMultiple: 2,
        reserveBufferAmount: 0,
        specialSavingsCountsForEligibility: true,
        ...(input?.policyOverrides ?? {}),
      }),
    },
  }
}

function createLiveLoanReviewPrismaStub(input?: {
  existingGuarantorApprovals?: Array<{
    id: string
    status: "approved" | "pending" | "rejected"
  }>
  existingLoanRequestStatus?: "approved" | "rejected" | "submitted" | "under_review"
  requiresDualLoanApproval?: boolean
}) {
  const loanApprovals: any[] = []
  const loanRequestUpdates: any[] = []
  const loanUpserts: any[] = []
  const auditLogCreates: any[] = []
  const guarantorApprovalUpdates: any[] = []
  const existingLoanRequest = {
    eligibleAmountSnapshot: 200000,
    estimatedMonthlyServicing: 10000,
    extraMonthlySavingsAmount: 0,
    id: "loan-request-1",
    loanProductId: "product-1",
    memberId: "member-1",
    requestedAmount: 100000,
    requestedTermMonths: 10,
    status: input?.existingLoanRequestStatus ?? "submitted",
    tenantId: "tenant-1",
  }
  const existingGuarantorApprovals =
    input?.existingGuarantorApprovals ?? []

  const tx = {
    auditLog: {
      create: async (input: any) => {
        auditLogCreates.push(input)
        return input
      },
    },
    loan: {
      upsert: async (input: any) => {
        loanUpserts.push(input)
        return input
      },
    },
    loanApproval: {
      create: async (input: any) => {
        loanApprovals.push(input)
        return input
      },
      findMany: async () => [],
    },
    loanGuarantorApproval: {
      findFirst: async (args: any) => {
        const approval = existingGuarantorApprovals[0]

        if (!approval) {
          return null
        }

        if (
          args?.where?.guarantorMemberId &&
          args.where.guarantorMemberId !== "member-2"
        ) {
          return null
        }

        return {
          ...approval,
          guarantorMember: {
            email: "guarantor@example.com",
            fullName: "Guarantor One",
            id: "member-2",
            memberNumber: "M-002",
          },
          guarantorMemberId: "member-2",
          loanRequest: existingLoanRequest,
          loanRequestId: "loan-request-1",
          tenantId: "tenant-1",
        }
      },
      findMany: async (args?: any) =>
        existingGuarantorApprovals
          .map((approval) => ({
            ...approval,
            guarantorMemberId: "member-2",
            loanRequest: {
              ...existingLoanRequest,
              loanProduct: {
                id: "product-1",
                loanType: "normal",
                name: "Normal financing",
              },
              member: {
                fullName: "Borrower One",
                id: "member-1",
                memberNumber: "M-001",
              },
            },
            loanRequestId: "loan-request-1",
            requestedAt: new Date("2026-07-01T00:00:00.000Z"),
            requestedByUser: {
              email: "staff@example.com",
              fullName: "Finance Officer",
              id: "user-1",
            },
            respondedByUser: null,
            tenantId: "tenant-1",
          }))
          .filter((approval) => {
            if (
              args?.where?.guarantorMemberId &&
              approval.guarantorMemberId !== args.where.guarantorMemberId
            ) {
              return false
            }

            if (args?.where?.status && approval.status !== args.where.status) {
              return false
            }

            return true
          }),
      update: async (args: any) => {
        guarantorApprovalUpdates.push(args)
        return {
          ...existingGuarantorApprovals[0],
          ...args.data,
          guarantorMember: {
            email: "guarantor@example.com",
            fullName: "Guarantor One",
            id: "member-2",
            memberNumber: "M-002",
          },
          guarantorMemberId: "member-2",
          id: args.where.id,
          loanRequestId: "loan-request-1",
          respondedByUser: {
            email: "staff@example.com",
            fullName: "Finance Officer",
            id: "user-1",
          },
          tenantId: "tenant-1",
        }
      },
    },
    loanRequest: {
      findFirst: async () => existingLoanRequest,
      update: async (args: any) => {
        loanRequestUpdates.push(args)
        return {
          ...existingLoanRequest,
          ...args.data,
          loanProduct: {
            id: "product-1",
            loanType: "normal",
            name: "Normal financing",
          },
        }
      },
    },
    tenantPolicy: {
      findUnique: async () => ({
        requiresDualLoanApproval: input?.requiresDualLoanApproval ?? false,
      }),
    },
  }

  return {
    ...createLockedLoanPrismaStub(),
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
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
    guarantorApprovalUpdates,
    auditLogCreates,
    loanGuarantorApproval: tx.loanGuarantorApproval,
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loanApprovals,
    loanRequestUpdates,
    loanUpserts,
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

function createLiveDisbursementPrismaStub(input?: {
  approvedHoldAmount?: number
  outstandingFinancingAmount?: number
  principalAmount?: number
  reserveBufferAmount?: number
  totalContributionAmount?: number
}) {
  const ledgerLookups: unknown[] = []
  const loanLookups: unknown[] = []
  const principalAmount = input?.principalAmount ?? 100000

  return {
    ...createLockedLoanPrismaStub(),
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
    contribution: {
      aggregate: async () => ({
        _sum: { amount: input?.totalContributionAmount ?? 0 },
      }),
    },
    ledgerAccount: {
      findUnique: async (lookup: unknown) => {
        ledgerLookups.push(lookup)
        return { id: `ledger-${ledgerLookups.length}` }
      },
    },
    ledgerLookups,
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      aggregate: async (args: any) =>
        args._sum.outstandingPrincipal
          ? {
              _sum: {
                outstandingPrincipal:
                  input?.outstandingFinancingAmount ?? 0,
              },
            }
          : {
              _sum: {
                principalAmount: input?.approvedHoldAmount ?? 0,
              },
            },
      count: async () => 0,
      findFirst: async (lookup: unknown) => {
        loanLookups.push(lookup)
        return {
          id: "loan-1",
          principalAmount,
          tenantId: "tenant-1",
        }
      },
    },
    loanLookups,
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        disbursementRequiresDeployableFunds: true,
        reserveBufferAmount: input?.reserveBufferAmount ?? 0,
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

function createLiveRepaymentPrismaStub(input?: {
  outstandingPrincipal?: number
  scheduleItems?: Array<{
    amountPaid: number
    id: string
    installmentNumber: number
    status:
      | "due"
      | "overdue"
      | "paid"
      | "partially_paid"
      | "pending"
      | "waived"
    totalDue: number
  }>
}) {
  const auditLogCreates: any[] = []
  const ledgerLookups: unknown[] = []
  const ledgerTransactionCreates: any[] = []
  const loanUpdates: any[] = []
  const repaymentCreates: any[] = []
  const scheduleItemUpdates: any[] = []
  const scheduleItemUpdateManyCalls: any[] = []
  const scheduleItems = input?.scheduleItems ?? []
  const loan = {
    id: "loan-1",
    memberId: "member-1",
    outstandingPrincipal: input?.outstandingPrincipal ?? 25000,
    status: "active",
    tenantId: "tenant-1",
  }
  const liveMigrationState = {
    id: "tenant-1",
    initialMigrationStatus: "live_operations",
    migrationEmergencyUnlockUntil: null,
    migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
    startDate: new Date("2025-01-01T00:00:00.000Z"),
  }
  const migrationReadDelegates = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (args: any) => {
        auditLogCreates.push(args)
        return args
      },
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
      findMany: async () => [{ id: "member-1", joinedAt: null }],
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => liveMigrationState,
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
  const tx = {
    ...migrationReadDelegates,
    ledgerTransaction: {
      create: async (args: any) => {
        ledgerTransactionCreates.push(args)
        return {
          id: "ledger-transaction-1",
          ...args.data,
          entries: [],
        }
      },
    },
    loan: {
      count: async () => 0,
      findFirst: async () => loan,
      update: async (args: any) => {
        loanUpdates.push(args)
        if (args.data.outstandingPrincipal?.decrement) {
          loan.outstandingPrincipal =
            Number(loan.outstandingPrincipal) -
            Number(args.data.outstandingPrincipal.decrement)
        }
        loan.status = args.data.status ?? loan.status
        return {
          ...loan,
          ...args.data,
        }
      },
    },
    repayment: {
      create: async (args: any) => {
        repaymentCreates.push(args)
        return {
          id: "repayment-1",
          ...args.data,
        }
      },
    },
    repaymentScheduleItem: {
      findMany: async (args: any) => {
        const includedStatuses = args.where.status.in
        return scheduleItems
          .filter((item) => includedStatuses.includes(item.status))
          .sort((a, b) => a.installmentNumber - b.installmentNumber)
      },
      update: async (args: any) => {
        scheduleItemUpdates.push(args)
        const item = scheduleItems.find((row) => row.id === args.where.id)
        if (item) {
          item.amountPaid = args.data.amountPaid ?? item.amountPaid
          item.status = args.data.status ?? item.status
        }
        return item
      },
      updateMany: async (args: any) => {
        scheduleItemUpdateManyCalls.push(args)
        const ids = args.where.id.in
        let count = 0
        for (const item of scheduleItems) {
          if (ids.includes(item.id)) {
            item.status = args.data.status
            count += 1
          }
        }
        return { count }
      },
    },
  }

  return {
    ...createLockedLoanPrismaStub(),
    ...migrationReadDelegates,
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    auditLogCreates,
    ledgerAccount: {
      findUnique: async (lookup: unknown) => {
        ledgerLookups.push(lookup)
        return { id: `ledger-${ledgerLookups.length}` }
      },
    },
    ledgerLookups,
    ledgerTransactionCreates,
    loanUpdates,
    repaymentCreates,
    scheduleItemUpdateManyCalls,
    scheduleItemUpdates,
    scheduleItems,
  }
}

describe("loan live write guards", () => {
  test("blocks loan requests before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 100000,
          requestedTermMonths: 12,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberLookups).toHaveLength(0)
  })

  test("posts configured loan fee charge when a live loan request is submitted", async () => {
    const prisma = createLiveLoanRequestPrismaStub()

    await submitLoanRequest(
      {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.loanRequestCreates).toHaveLength(1)
    expect(prisma.chargeApplicationCreates[0]).toMatchObject({
      data: {
        amount: 2500,
        chargeDefinitionId: "loan-charge-1",
        loanRequestId: "loan-request-1",
        memberId: "member-1",
      },
    })
  })

  test("blocks loan requests when the monthly financing cycle is missing", async () => {
    const prisma = createLiveLoanRequestPrismaStub({ existingCycle: null })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Current monthly financing cycle is not open")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("blocks loan requests when the selected product allocation is exhausted", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      existingLoanRequests: [
        { amount: 29000, loanType: "quick", status: "submitted" },
        { amount: 100000, loanType: "quick", status: "rejected" },
      ],
    })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 2000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Quick financing allocation")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("excludes special savings from eligibility when tenant policy disables it", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      contributions: [
        { amount: 100000, committedAmount: 40000, extraSavingsAmount: 60000 },
      ],
      policyOverrides: {
        specialSavingsCountsForEligibility: false,
      },
    })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 90000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Requested amount exceeds")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("blocks quick emergency financing while the member has active financing when policy requires it", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      activeFinancingCount: 1,
      loanType: "quick",
    })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("blocks emergency financing")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("allows quick emergency financing overlap when tenant policy permits it", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      activeFinancingCount: 1,
      loanType: "quick",
      policyOverrides: {
        activeFinancingBlocksEmergency: false,
      },
    })

    await submitLoanRequest(
      {
        actorUserId: "user-1",
        loanProductId: "product-1",
        memberId: "member-1",
        requestedAmount: 25000,
        requestedTermMonths: 10,
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanRequestCreates).toHaveLength(1)
  })

  test("creates pending guarantor approvals when guarantors are selected", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      guarantorMembers: [
        {
          email: "guarantor@example.com",
          fullName: "Guarantor One",
          id: "member-2",
          memberNumber: "M-002",
        },
      ],
    })

    const request = await submitLoanRequest(
      {
        actorUserId: "user-1",
        guarantorMemberIds: ["member-2"],
        loanProductId: "product-1",
        memberId: "member-1",
        requestedAmount: 25000,
        requestedTermMonths: 10,
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanGuarantorApprovalCreates).toHaveLength(1)
    expect(prisma.loanGuarantorApprovalCreates[0]).toMatchObject({
      data: {
        guarantorMemberId: "member-2",
        loanRequestId: "loan-request-1",
        requestedByUserId: "user-1",
        status: "pending",
      },
    })
    expect(request.guarantorApprovals[0].guarantorMember.fullName).toBe(
      "Guarantor One",
    )
  })

  test("blocks members from guaranteeing their own financing request", async () => {
    const prisma = createLiveLoanRequestPrismaStub()

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          guarantorMemberIds: ["member-1"],
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("cannot guarantee their own")

    expect(prisma.loanGuarantorApprovalCreates).toHaveLength(0)
  })

  test("blocks final loan approval until guarantors approve", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [{ id: "approval-1", status: "pending" }],
    })

    await expect(
      reviewLoanRequest(
        {
          actorUserId: "user-1",
          loanRequestId: "loan-request-1",
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("until all guarantors approve")

    expect(prisma.loanUpserts).toHaveLength(0)
  })

  test("materializes approved loan after all guarantors approve", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [{ id: "approval-1", status: "approved" }],
    })

    await reviewLoanRequest(
      {
        actorUserId: "user-1",
        loanRequestId: "loan-request-1",
        status: "approved",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanUpserts).toHaveLength(1)
    expect(prisma.loanRequestUpdates[0]).toMatchObject({
      data: {
        status: "approved",
      },
    })
  })

  test("records guarantor approval evidence with audit metadata", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [{ id: "approval-1", status: "pending" }],
    })

    await reviewLoanGuarantorApproval(
      {
        actorUserId: "user-1",
        guarantorApprovalId: "approval-1",
        notes: "Approved by email confirmation.",
        status: "approved",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.guarantorApprovalUpdates[0]).toMatchObject({
      data: {
        respondedByUserId: "user-1",
        responseNotes: "Approved by email confirmation.",
        status: "approved",
      },
      where: {
        id: "approval-1",
      },
    })
  })

  test("lists guarantor approvals scoped to the linked member", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [
        { id: "approval-1", status: "pending" },
        { id: "approval-2", status: "approved" },
      ],
    })

    const approvals = await listMemberLoanGuarantorApprovals(
      {
        guarantorMemberId: "member-2",
        status: "pending",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(approvals).toHaveLength(1)
    expect(approvals[0]).toMatchObject({
      guarantorMemberId: "member-2",
      loanRequest: {
        member: {
          fullName: "Borrower One",
        },
      },
      status: "pending",
    })
  })

  test("lets the linked guarantor member approve their own pending request", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [{ id: "approval-1", status: "pending" }],
    })

    await respondMemberLoanGuarantorApproval(
      {
        actorUserId: "member-user-1",
        guarantorApprovalId: "approval-1",
        guarantorMemberId: "member-2",
        notes: "I agree to guarantee this financing.",
        status: "approved",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.guarantorApprovalUpdates[0]).toMatchObject({
      data: {
        respondedByUserId: "member-user-1",
        responseNotes: "I agree to guarantee this financing.",
        status: "approved",
      },
      where: {
        id: "approval-1",
      },
    })
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "loan_guarantor_approval.approved",
        actorUserId: "member-user-1",
        metadata: {
          responseSource: "member_self_service",
          status: "approved",
        },
      },
    })
  })

  test("blocks a member from answering another guarantor's request", async () => {
    const prisma = createLiveLoanReviewPrismaStub({
      existingGuarantorApprovals: [{ id: "approval-1", status: "pending" }],
    })

    await expect(
      respondMemberLoanGuarantorApproval(
        {
          actorUserId: "member-user-1",
          guarantorApprovalId: "approval-1",
          guarantorMemberId: "member-3",
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never,
      )
    ).rejects.toThrow("Loan guarantor approval not found")

    expect(prisma.guarantorApprovalUpdates).toHaveLength(0)
  })

  test("does not reserve rejected, cancelled, or expired request amounts", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      existingLoanRequests: [
        { amount: 30000, loanType: "quick", status: "rejected" },
        { amount: 30000, loanType: "quick", status: "cancelled" },
        { amount: 30000, loanType: "quick", status: "expired" },
      ],
    })

    await submitLoanRequest(
      {
        actorUserId: "user-1",
        loanProductId: "product-1",
        memberId: "member-1",
        requestedAmount: 25000,
        requestedTermMonths: 10,
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanRequestCreates).toHaveLength(1)
  })

  test("blocks loan disbursement before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      disburseLoan(
        {
          actorUserId: "user-1",
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(0)
  })

  test("blocks loan disbursement when deployable funds are insufficient", async () => {
    const prisma = createLiveDisbursementPrismaStub({
      principalAmount: 100000,
      reserveBufferAmount: 10000,
      totalContributionAmount: 50000,
    })

    await expect(
      disburseLoan(
        {
          actorUserId: "user-1",
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Deployable funds are insufficient")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(1)
  })

  test("blocks repayment posting before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      postRepayment(
        {
          actorUserId: "user-1",
          amount: 25000,
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(0)
  })

  test("stops scheduled servicing when repayment clears the outstanding balance", async () => {
    const prisma = createLiveRepaymentPrismaStub({
      outstandingPrincipal: 25000,
      scheduleItems: [
        {
          amountPaid: 20000,
          id: "schedule-1",
          installmentNumber: 1,
          status: "partially_paid",
          totalDue: 30000,
        },
        {
          amountPaid: 0,
          id: "schedule-2",
          installmentNumber: 2,
          status: "pending",
          totalDue: 30000,
        },
      ],
    })

    await postRepayment(
      {
        actorUserId: "user-1",
        amount: 25000,
        loanId: "loan-1",
        reference: "EARLY-SETTLEMENT-1",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanUpdates[0]).toMatchObject({
      data: {
        outstandingPrincipal: { decrement: 25000 },
        status: "completed",
      },
      where: { id: "loan-1" },
    })
    expect(prisma.loanUpdates[0].data.closedAt).toBeInstanceOf(Date)
    expect(prisma.scheduleItemUpdates).toHaveLength(2)
    expect(prisma.scheduleItems[0]).toMatchObject({
      amountPaid: 30000,
      status: "paid",
    })
    expect(prisma.scheduleItems[1]).toMatchObject({
      amountPaid: 15000,
      status: "waived",
    })
    expect(prisma.scheduleItemUpdateManyCalls[0]).toMatchObject({
      data: { status: "waived" },
      where: {
        id: { in: ["schedule-2"] },
        loanId: "loan-1",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.ledgerTransactionCreates).toHaveLength(1)
    expect(prisma.auditLogCreates).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "loan.early_settled",
          entityId: "loan-1",
          entityType: "Loan",
          metadata: expect.objectContaining({
            previousOutstandingPrincipal: 25000,
            repaymentAmount: 25000,
            repaymentId: "repayment-1",
            waivedScheduleItemCount: 1,
            waivedScheduleItemIds: ["schedule-2"],
            waivedScheduleOutstandingAmount: 15000,
          }),
        }),
      }),
    )
  })

  test("allows import repayment posting through the live-write guard", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      postRepayment(
        {
          actorUserId: "user-1",
          amount: 25000,
          loanId: "loan-1",
          sourceType: "import",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
    expect(prisma.loanLookups).toHaveLength(0)
  })
})
