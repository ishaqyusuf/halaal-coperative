import { describe, expect, test } from "bun:test"
import {
  getMonthlyFinancingCycleHealth,
  getTenantFinancingSettingsWorkspace,
  openMonthlyFinancingCycle,
  previewMonthlyFinancingCycle,
  updateLoanProductSettings,
  updateTenantFinancingCyclePolicy,
} from "./financing-cycles"

type PreviewStubInput = {
  approvedHoldAmount?: number
  contributionAmount?: number
  existingCycle?: (Record<string, unknown> & { id: string; status: "draft" | "open" | "paused" | "closed" }) | null
  loanRequests?: Array<{
    amount: number
    loanType: "normal" | "quick"
    status: "approved" | "cancelled" | "draft" | "expired" | "rejected" | "submitted" | "under_review"
  }>
  loanProducts?: Array<{
    code: string | null
    id: string
    isActive: boolean
    loanType: "normal" | "quick"
    maxSavingsMultiple: number
    name: string
    termMonths: number
  }>
  loans?: Array<{
    amount: number
    loanType: "normal" | "quick"
  }>
  policy?: Record<string, unknown> | null
  projectedAmount?: number
  outstandingFinancingAmount?: number
}

function createPreviewPrismaStub(input: PreviewStubInput = {}) {
  const calls: Record<string, any[]> = {
    contributionAggregate: [],
    contributionPlanAggregate: [],
    financingCycleFindUnique: [],
    loanProductFindMany: [],
    loanFindMany: [],
    loanRequestFindMany: [],
  }

  return {
    calls,
    contribution: {
      aggregate: async (args: any) => {
        calls.contributionAggregate.push(args)
        return { _sum: { amount: input.contributionAmount ?? 0 } }
      },
    },
    contributionPlan: {
      aggregate: async (args: any) => {
        calls.contributionPlanAggregate.push(args)
        return { _sum: { amount: input.projectedAmount ?? 0 } }
      },
    },
    financingCycle: {
      findUnique: async (args: any) => {
        calls.financingCycleFindUnique.push(args)
        return input.existingCycle ?? null
      },
    },
    loanProduct: {
      findMany: async (args: any) => {
        calls.loanProductFindMany.push(args)
        return input.loanProducts ?? []
      },
    },
    loan: {
      aggregate: async (args: any) =>
        args._sum.outstandingPrincipal
          ? { _sum: { outstandingPrincipal: input.outstandingFinancingAmount ?? 0 } }
          : { _sum: { principalAmount: input.approvedHoldAmount ?? 0 } },
      findMany: async (args: any) => {
        calls.loanFindMany.push(args)
        return (input.loans ?? []).map((loan) => ({
          principalAmount: loan.amount,
          loanProduct: { loanType: loan.loanType },
        }))
      },
    },
    loanRequest: {
      findMany: async (args: any) => {
        calls.loanRequestFindMany.push(args)
        return (input.loanRequests ?? []).map((request) => ({
          requestedAmount: request.amount,
          status: request.status,
          loanProduct: { loanType: request.loanType },
        }))
      },
    },
    tenantPolicy: {
      findUnique: async () => input.policy ?? null,
    },
  }
}

describe("monthly financing cycle previews", () => {
  test("calculates projected capacity, allocations, usage, and tenant-scoped filters", async () => {
    const prisma = createPreviewPrismaStub({
      contributionAmount: 50000,
      loanRequests: [
        { amount: 10000, loanType: "quick", status: "submitted" },
        { amount: 50000, loanType: "quick", status: "rejected" },
        { amount: 30000, loanType: "normal", status: "approved" },
      ],
      loans: [{ amount: 10000, loanType: "normal" }],
      projectedAmount: 200000,
    })

    const preview = await previewMonthlyFinancingCycle(
      {
        periodStart: new Date("2026-07-14T12:00:00.000Z"),
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(preview.periodStart.toISOString()).toBe("2026-07-01T00:00:00.000Z")
    expect(preview.periodEnd.toISOString()).toBe("2026-07-31T00:00:00.000Z")
    expect(preview.projectedCommitmentAmount).toBe(200000)
    expect(preview.receivedContributionAmount).toBe(50000)
    expect(preview.collectionCoverage).toBe(0.25)
    expect(preview.totalCapacityAmount).toBe(200000)
    expect(preview.quick.budgetAmount).toBe(60000)
    expect(preview.quick.requestedReservedAmount).toBe(10000)
    expect(preview.quick.remainingAmount).toBe(50000)
    expect(preview.normal.budgetAmount).toBe(140000)
    expect(preview.normal.approvedAmount).toBe(30000)
    expect(preview.normal.disbursedAmount).toBe(10000)
    expect(preview.normal.heldAmount).toBe(20000)
    expect(preview.normal.remainingAmount).toBe(110000)

    expect(prisma.calls.contributionPlanAggregate[0].where.tenantId).toBe("tenant-1")
    expect(prisma.calls.contributionAggregate[0].where.tenantId).toBe("tenant-1")
    expect(prisma.calls.loanRequestFindMany[0].where.tenantId).toBe("tenant-1")
    expect(prisma.calls.loanFindMany[0].where.tenantId).toBe("tenant-1")
  })

  test("deducts reserve buffer before splitting quick and normal budgets", async () => {
    const prisma = createPreviewPrismaStub({
      policy: {
        financingCapacityBasis: "projected_monthly_commitments",
        loanIntakeReservationMode: "submitted_request_amount",
        normalLoanAllocationPercentage: 75,
        quickLoanAllocationPercentage: 25,
        reserveBufferAmount: 10000,
      },
      projectedAmount: 100000,
    })

    const preview = await previewMonthlyFinancingCycle(
      { periodStart: new Date("2026-07-01T00:00:00.000Z"), tenantId: "tenant-1" },
      prisma as never,
    )

    expect(preview.totalCapacityAmount).toBe(90000)
    expect(preview.quick.budgetAmount).toBe(22500)
    expect(preview.normal.budgetAmount).toBe(67500)
  })

  test("builds a financing settings workspace with policy and product defaults", async () => {
    const prisma = createPreviewPrismaStub({
      loanProducts: [
        {
          code: "EMG",
          id: "quick-1",
          isActive: true,
          loanType: "quick",
          maxSavingsMultiple: 1.5,
          name: "Express financing",
          termMonths: 3,
        },
        {
          code: "NOR",
          id: "normal-1",
          isActive: true,
          loanType: "normal",
          maxSavingsMultiple: 2,
          name: "Standard financing",
          termMonths: 18,
        },
      ],
      policy: {
        disbursementRequiresDeployableFunds: true,
        financingCapacityBasis: "projected_monthly_commitments",
        id: "policy-1",
        loanEligibilityMultiple: 2.5,
        loanIntakeReservationMode: "submitted_request_amount",
        normalLoanAllocationPercentage: 65,
        normalLoanTermMonths: 20,
        quickLoanAllocationPercentage: 35,
        quickLoanTermMonths: 4,
        requiresDualLoanApproval: true,
        reserveBufferAmount: 5000,
      },
      projectedAmount: 100000,
    })

    const workspace = await getTenantFinancingSettingsWorkspace(
      { tenantId: "tenant-1" },
      prisma as never,
    )

    expect(workspace.policy).toMatchObject({
      id: "policy-1",
      loanEligibilityMultiple: 2.5,
      normalLoanAllocationPercentage: 65,
      normalLoanTermMonths: 20,
      quickLoanAllocationPercentage: 35,
      quickLoanTermMonths: 4,
      requiresDualLoanApproval: true,
      reserveBufferAmount: 5000,
    })
    expect(workspace.products.quick).toMatchObject({
      code: "EMG",
      id: "quick-1",
      name: "Express financing",
      termMonths: 3,
    })
    expect(workspace.products.normal).toMatchObject({
      code: "NOR",
      id: "normal-1",
      name: "Standard financing",
      termMonths: 18,
    })
    expect(prisma.calls.loanProductFindMany[0].where.tenantId).toBe("tenant-1")
  })

  test("builds cycle health warnings and deployable funds", async () => {
    const prisma = createPreviewPrismaStub({
      approvedHoldAmount: 10000,
      contributionAmount: 40000,
      existingCycle: {
        id: "cycle-1",
        normalAllocationPercentage: 70,
        normalBudgetAmount: 70000,
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        projectedCommitmentAmount: 100000,
        quickAllocationPercentage: 30,
        quickBudgetAmount: 30000,
        receivedContributionAmount: 40000,
        reserveBufferAmount: 5000,
        status: "open",
        totalCapacityAmount: 100000,
      },
      loanRequests: [
        { amount: 30000, loanType: "quick", status: "approved" },
        { amount: 70000, loanType: "normal", status: "rejected" },
      ],
      outstandingFinancingAmount: 5000,
      policy: {
        reserveBufferAmount: 5000,
      },
      projectedAmount: 100000,
    })

    const health = await getMonthlyFinancingCycleHealth(
      {
        periodStart: new Date("2026-07-14T12:00:00.000Z"),
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(health.intakeStatus).toBe("open")
    expect(health.quick.remainingAmount).toBe(0)
    expect(health.normal.remainingAmount).toBe(70000)
    expect(health.deployableFunds).toMatchObject({
      approvedHoldAmount: 10000,
      deployableFunds: 20000,
      outstandingFinancingAmount: 5000,
      reserveBufferAmount: 5000,
      totalContributionAmount: 40000,
    })
    expect(health.warnings.map((warning) => warning.key)).toEqual([
      "quick_quota_closed",
      "collections_below_projected",
    ])
  })

  test("rejects invalid allocation percentages", async () => {
    const prisma = createPreviewPrismaStub({
      policy: {
        normalLoanAllocationPercentage: 60,
        quickLoanAllocationPercentage: 60,
      },
      projectedAmount: 100000,
    })

    await expect(
      previewMonthlyFinancingCycle({ tenantId: "tenant-1" }, prisma as never),
    ).rejects.toThrow("must total 100")
  })
})

describe("monthly financing cycle writes", () => {
  test("opens a cycle with the preview snapshots and audit metadata", async () => {
    const auditCreates: any[] = []
    const upserts: any[] = []
    const previewPrisma = createPreviewPrismaStub({
      contributionAmount: 25000,
      projectedAmount: 100000,
    })
    const prisma = {
      ...previewPrisma,
      $transaction: async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          auditLog: {
            create: async (args: any) => {
              auditCreates.push(args)
              return args
            },
          },
          financingCycle: {
            upsert: async (args: any) => {
              upserts.push(args)
              return { id: "cycle-1", ...args.create }
            },
          },
        }),
    }

    const cycle = await openMonthlyFinancingCycle(
      {
        actorUserId: "user-1",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        statusNote: "Board-approved July cycle.",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(cycle.id).toBe("cycle-1")
    expect(upserts[0].create).toMatchObject({
      normalBudgetAmount: 70000,
      projectedCommitmentAmount: 100000,
      quickBudgetAmount: 30000,
      receivedContributionAmount: 25000,
      status: "open",
      statusNote: "Board-approved July cycle.",
      tenantId: "tenant-1",
      totalCapacityAmount: 100000,
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "financing_cycle.opened",
        actorUserId: "user-1",
        entityId: "cycle-1",
        entityType: "FinancingCycle",
        tenantId: "tenant-1",
      },
    })
  })

  test("updates tenant financing cycle policy with validation and audit logging", async () => {
    const auditCreates: any[] = []
    const upserts: any[] = []
    const prisma = {
      $transaction: async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          auditLog: {
            create: async (args: any) => {
              auditCreates.push(args)
              return args
            },
          },
          tenantPolicy: {
            upsert: async (args: any) => {
              upserts.push(args)
              return {
                activeFinancingBlocksEmergency:
                  args.update.activeFinancingBlocksEmergency ?? true,
                activeFinancingBlocksProcurement:
                  args.update.activeFinancingBlocksProcurement ?? true,
                disbursementRequiresDeployableFunds:
                  args.update.disbursementRequiresDeployableFunds ?? true,
                financingCapacityBasis:
                  args.update.financingCapacityBasis ??
                  "projected_monthly_commitments",
                foodPurchaseAllowsCommitmentReductionDuringPayback:
                  args.update.foodPurchaseAllowsCommitmentReductionDuringPayback ??
                  false,
                foodPurchaseMaximumPaybackMonths:
                  args.update.foodPurchaseMaximumPaybackMonths ?? 1,
                id: "policy-1",
                loanEligibilityMultiple: args.update.loanEligibilityMultiple,
                loanIntakeReservationMode:
                  args.update.loanIntakeReservationMode ??
                  "submitted_request_amount",
                normalLoanAllocationPercentage:
                  args.update.normalLoanAllocationPercentage,
                normalLoanTermMonths: args.update.normalLoanTermMonths,
                procurementAllowsCommitmentReductionDuringPayback:
                  args.update.procurementAllowsCommitmentReductionDuringPayback ??
                  false,
                procurementMaximumPaybackMonths:
                  args.update.procurementMaximumPaybackMonths ?? 12,
                quickLoanAllocationPercentage:
                  args.update.quickLoanAllocationPercentage,
                quickLoanTermMonths: args.update.quickLoanTermMonths,
                requiresDualLoanApproval: args.update.requiresDualLoanApproval,
                reserveBufferAmount: args.update.reserveBufferAmount,
                specialSavingsCountsForEligibility:
                  args.update.specialSavingsCountsForEligibility ?? true,
                strictCommitmentDuringFinancing:
                  args.update.strictCommitmentDuringFinancing ?? true,
              }
            },
          },
        }),
      tenantPolicy: {
        findUnique: async () => ({
          activeFinancingBlocksEmergency: true,
          activeFinancingBlocksProcurement: true,
          disbursementRequiresDeployableFunds: true,
          financingCapacityBasis: "projected_monthly_commitments",
          foodPurchaseAllowsCommitmentReductionDuringPayback: false,
          foodPurchaseMaximumPaybackMonths: 1,
          loanEligibilityMultiple: 2,
          loanIntakeReservationMode: "submitted_request_amount",
          normalLoanAllocationPercentage: 70,
          normalLoanTermMonths: 18,
          procurementAllowsCommitmentReductionDuringPayback: false,
          procurementMaximumPaybackMonths: 12,
          quickLoanAllocationPercentage: 30,
          quickLoanTermMonths: 3,
          requiresDualLoanApproval: false,
          reserveBufferAmount: 0,
          specialSavingsCountsForEligibility: true,
          strictCommitmentDuringFinancing: true,
        }),
      },
    }

    const policy = await updateTenantFinancingCyclePolicy(
      {
        activeFinancingBlocksEmergency: false,
        activeFinancingBlocksProcurement: false,
        actorUserId: "user-1",
        foodPurchaseAllowsCommitmentReductionDuringPayback: true,
        foodPurchaseMaximumPaybackMonths: 2,
        loanEligibilityMultiple: 2.5,
        normalLoanAllocationPercentage: 65,
        normalLoanTermMonths: 20,
        procurementAllowsCommitmentReductionDuringPayback: true,
        procurementMaximumPaybackMonths: 10,
        quickLoanAllocationPercentage: 35,
        quickLoanTermMonths: 4,
        requiresDualLoanApproval: true,
        reserveBufferAmount: 5000,
        specialSavingsCountsForEligibility: false,
        strictCommitmentDuringFinancing: false,
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(policy.id).toBe("policy-1")
    expect(upserts[0].update).toMatchObject({
      activeFinancingBlocksEmergency: false,
      activeFinancingBlocksProcurement: false,
      foodPurchaseAllowsCommitmentReductionDuringPayback: true,
      foodPurchaseMaximumPaybackMonths: 2,
      loanEligibilityMultiple: 2.5,
      normalLoanAllocationPercentage: 65,
      normalLoanTermMonths: 20,
      procurementAllowsCommitmentReductionDuringPayback: true,
      procurementMaximumPaybackMonths: 10,
      quickLoanAllocationPercentage: 35,
      quickLoanTermMonths: 4,
      requiresDualLoanApproval: true,
      reserveBufferAmount: 5000,
      specialSavingsCountsForEligibility: false,
      strictCommitmentDuringFinancing: false,
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "tenant_policy.financing_cycle_updated",
        actorUserId: "user-1",
        entityId: "policy-1",
        entityType: "TenantPolicy",
        tenantId: "tenant-1",
      },
    })
  })

  test("updates loan product settings with tenant scoping and audit logging", async () => {
    const auditCreates: any[] = []
    const updates: any[] = []
    const findFirstCalls: any[] = []
    const prisma = {
      $transaction: async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          auditLog: {
            create: async (args: any) => {
              auditCreates.push(args)
              return args
            },
          },
          loanProduct: {
            update: async (args: any) => {
              updates.push(args)
              return {
                code: args.data.code,
                id: "product-1",
                isActive: args.data.isActive,
                loanType: args.data.loanType,
                maxSavingsMultiple: args.data.maxSavingsMultiple,
                name: args.data.name,
                termMonths: args.data.termMonths,
              }
            },
          },
        }),
      loanProduct: {
        findFirst: async (args: any) => {
          findFirstCalls.push(args)
          return {
            id: "product-1",
            tenantId: "tenant-1",
          }
        },
      },
    }

    const product = await updateLoanProductSettings(
      {
        actorUserId: "user-1",
        isActive: true,
        loanProductId: "product-1",
        loanType: "quick",
        code: "emg",
        maxSavingsMultiple: 1.5,
        name: "Express financing",
        tenantId: "tenant-1",
        termMonths: 3,
      },
      prisma as never,
    )

    expect(product).toMatchObject({
      code: "EMG",
      id: "product-1",
      loanType: "quick",
      name: "Express financing",
      termMonths: 3,
    })
    expect(findFirstCalls[0].where).toMatchObject({
      id: "product-1",
      tenantId: "tenant-1",
    })
    expect(updates[0].data).toMatchObject({
      code: "EMG",
      isActive: true,
      loanType: "quick",
      maxSavingsMultiple: 1.5,
      name: "Express financing",
      termMonths: 3,
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "loan_product.settings_updated",
        actorUserId: "user-1",
        entityId: "product-1",
        entityType: "LoanProduct",
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects invalid loan product settings", async () => {
    const prisma = {
      loanProduct: {
        findFirst: async () => null,
      },
    }

    await expect(
      updateLoanProductSettings(
        {
          actorUserId: "user-1",
          isActive: true,
          loanType: "normal",
          maxSavingsMultiple: 2,
          name: "Normal financing",
          tenantId: "tenant-1",
          termMonths: 0,
        },
        prisma as never,
      ),
    ).rejects.toThrow("term months")
  })
})
