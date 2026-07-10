import { describe, expect, test } from "bun:test"
import {
  createMemberPaymentReceipt,
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceipts,
  reviewMemberPaymentReceipt,
} from "./payment-receipts"

function receiptRow(overrides: Record<string, unknown> = {}) {
  return {
    allocations: [
      {
        amount: 15000,
        category: "commitment",
        contributionPlanId: null,
        createdAt: new Date("2026-07-08T10:00:00.000Z"),
        foodPurchaseApplicationId: null,
        id: "allocation-1",
        loanId: null,
        memberId: "member-1",
        notes: null,
        periodIntent: "current_period",
        postedContributionId: null,
        postedRepaymentId: null,
        postedShareLedgerEntryId: null,
        procurementRepaymentScheduleItemId: null,
        projectFinancingRequestId: null,
        receiptId: "receipt-1",
        targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
        tenantId: "tenant-1",
      },
    ],
    channel: "transfer",
    createdAt: new Date("2026-07-08T10:00:00.000Z"),
    id: "receipt-1",
    member: {
      email: "aisha@example.com",
      fullName: "Aisha Bello",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    memberNotes: "July payment",
    paidAt: new Date("2026-07-08T00:00:00.000Z"),
    paymentReference: "BANK-001",
    proofDocumentName: null,
    proofDocumentUrl: "https://example.com/receipt-1.png",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewNotes: null,
    status: "submitted",
    submittedAt: new Date("2026-07-08T10:00:00.000Z"),
    submittedByUserId: "user-1",
    totalAmount: 15000,
    updatedAt: new Date("2026-07-08T10:00:00.000Z"),
    ...overrides,
  }
}

function liveMigrationDelegates() {
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
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-07-01T00:00:00.000Z"),
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({ shareConfigurationMode: "unit_based" }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

describe("member payment receipt queries", () => {
  test("creates staged receipt allocations with duplicate checks and audit", async () => {
    const receiptCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const receipt = await createMemberPaymentReceipt(
      {
        allocations: [
          {
            amount: 10000,
            category: "commitment",
            periodIntent: "current_period",
            targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
          },
          {
            amount: 5000,
            category: "special_savings",
            periodIntent: "future_period",
            targetPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
          },
        ],
        channel: "transfer",
        memberId: "member-1",
        memberNotes: "July plus August savings",
        paidAt: new Date("2026-07-08T00:00:00.000Z"),
        paymentReference: "BANK-001",
        proofDocumentUrl: "https://example.com/receipt-1.png",
        submittedByUserId: "user-1",
        tenantId: "tenant-1",
        totalAmount: 15000,
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            memberPaymentReceipt: {
              create: async (input: any) => {
                receiptCreates.push(input)
                return receiptRow({
                  ...input.data,
                  allocations: input.data.allocations.create.map(
                    (allocation: Record<string, unknown>, index: number) => ({
                      ...allocation,
                      createdAt: new Date("2026-07-08T10:00:00.000Z"),
                      id: `allocation-${index + 1}`,
                      postedContributionId: null,
                      postedRepaymentId: null,
                      postedShareLedgerEntryId: null,
                      procurementRepaymentScheduleItemId: null,
                      receiptId: "receipt-1",
                      updatedAt: new Date("2026-07-08T10:00:00.000Z"),
                    })
                  ),
                  id: "receipt-1",
                })
              },
            },
          }),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findFirst: async () => ({ id: "member-1" }),
        },
        memberPaymentReceipt: {
          findFirst: async () => null,
        },
        user: {
          findFirst: async () => ({ id: "user-1" }),
        },
      } as never
    )

    expect(receipt).toMatchObject({
      id: "receipt-1",
      member: {
        email: "aisha@example.com",
      },
      status: "submitted",
      totalAmount: 15000,
      allocations: [
        { amount: 10000, category: "commitment" },
        { amount: 5000, category: "special_savings" },
      ],
    })
    expect(receiptCreates[0]).toMatchObject({
      data: {
        memberId: "member-1",
        paymentReference: "BANK-001",
        totalAmount: 15000,
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "member_payment_receipt.submitted",
        actorType: "user",
        actorUserId: "user-1",
        entityId: "receipt-1",
        entityType: "MemberPaymentReceipt",
        metadata: {
          allocationCategories: ["commitment", "special_savings"],
          memberId: "member-1",
          paymentReference: "BANK-001",
          totalAmount: 15000,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects duplicate non-rejected payment references", async () => {
    await expect(
      createMemberPaymentReceipt(
        {
          allocations: [{ amount: 15000, category: "commitment" }],
          memberId: "member-1",
          paidAt: new Date("2026-07-08T00:00:00.000Z"),
          paymentReference: "BANK-001",
          tenantId: "tenant-1",
          totalAmount: 15000,
        },
        {
          contributionPlan: {
            count: async () => 0,
          },
          loan: {
            count: async () => 0,
          },
          member: {
            findFirst: async () => ({ id: "member-1" }),
          },
          memberPaymentReceipt: {
            findFirst: async () => ({ id: "receipt-existing" }),
          },
        } as never
      )
    ).rejects.toThrow("already uses this payment reference")
  })

  test("summarizes payment receipts within a member boundary", async () => {
    const countWheres: unknown[] = []

    const summary = await getMemberScopedPaymentReceiptSummary(
      {
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      {
        memberPaymentReceipt: {
          count: async (input: Record<string, unknown>) => {
            countWheres.push(input.where)
            return countWheres.length
          },
        },
      } as never
    )

    expect(summary).toEqual({
      approvedReceipts: 4,
      correctionRequestedReceipts: 3,
      pendingReviewReceipts: 3,
      rejectedReceipts: 5,
      submittedReceipts: 1,
      underReviewReceipts: 2,
    })
    expect(countWheres).toHaveLength(5)
    for (const where of countWheres) {
      expect(where).toMatchObject({
        memberId: "member-1",
        tenantId: "tenant-1",
      })
    }
  })

  test("lists receipts with submitted date filters and custom limit", async () => {
    const findManyInputs: Record<string, unknown>[] = []
    const submittedFrom = new Date("2026-07-01T00:00:00.000Z")
    const submittedTo = new Date("2026-07-31T23:59:59.999Z")

    const receipts = await listMemberPaymentReceipts(
      "tenant-1",
      {
        limit: 250,
        status: "approved",
        submittedFrom,
        submittedTo,
      },
      {
        memberPaymentReceipt: {
          findMany: async (input: Record<string, unknown>) => {
            findManyInputs.push(input)
            return [receiptRow({ status: "approved" })]
          },
        },
      } as never
    )

    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({
      id: "receipt-1",
      status: "approved",
    })
    expect(findManyInputs[0]).toMatchObject({
      take: 250,
      where: {
        status: "approved",
        submittedAt: {
          gte: submittedFrom,
          lte: submittedTo,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("requires adjustment reason when review allocations change", async () => {
    await expect(
      reviewMemberPaymentReceipt(
        {
          actorUserId: "finance-1",
          adjustedAllocations: [
            {
              amount: 12000,
              category: "commitment",
              periodIntent: "current_period",
              targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
            },
            {
              amount: 3000,
              category: "special_savings",
              periodIntent: "current_period",
              targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
            },
          ],
          decision: "under_review",
          receiptId: "receipt-1",
          tenantId: "tenant-1",
        },
        {
          contributionPlan: {
            count: async () => 0,
          },
          loan: {
            count: async () => 0,
          },
          memberPaymentReceipt: {
            findFirst: async () => receiptRow(),
          },
          user: {
            findFirst: async () => ({ id: "finance-1" }),
          },
        } as never
      )
    ).rejects.toThrow("adjustment reason is required")
  })

  test("records before and after allocation snapshots when review changes allocations", async () => {
    const allocationCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        adjustedAllocations: [
          {
            amount: 12000,
            category: "commitment",
            periodIntent: "current_period",
            targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
          },
          {
            amount: 3000,
            category: "special_savings",
            periodIntent: "current_period",
            targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
          },
        ],
        adjustmentReason: "Split excess into special savings.",
        decision: "under_review",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            memberPaymentReceipt: {
              update: async (input: any) =>
                receiptRow({
                  ...input.data,
                  reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
                  reviewedByUserId: "finance-1",
                  status: "under_review",
                }),
            },
            memberPaymentReceiptAllocation: {
              createMany: async (input: Record<string, unknown>) => {
                allocationCreates.push(input)
                return { count: 2 }
              },
              deleteMany: async () => ({ count: 1 }),
            },
          }),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        memberPaymentReceipt: {
          findFirst: async () => receiptRow(),
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("under_review")
    expect(allocationCreates[0]).toMatchObject({
      data: [
        { amount: 12000, category: "commitment" },
        { amount: 3000, category: "special_savings" },
      ],
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "member_payment_receipt.under_review",
        metadata: {
          adjustmentReason: "Split excess into special savings.",
          allocationsChanged: true,
          previousAllocations: [
            {
              amount: 15000,
              category: "commitment",
              targetPeriodStart: "2026-07-01T00:00:00.000Z",
            },
          ],
          nextAllocations: [
            {
              amount: 12000,
              category: "commitment",
              targetPeriodStart: "2026-07-01T00:00:00.000Z",
            },
            {
              amount: 3000,
              category: "special_savings",
              targetPeriodStart: "2026-07-01T00:00:00.000Z",
            },
          ],
        },
      },
    })
  })

  test("blocks approving unsupported staged categories", async () => {
    await expect(
      reviewMemberPaymentReceipt(
        {
          actorUserId: "finance-1",
          decision: "approved",
          receiptId: "receipt-1",
          tenantId: "tenant-1",
        },
        {
          ...liveMigrationDelegates(),
          $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
            callback({
              ...liveMigrationDelegates(),
              contributionPlan: {
                findFirst: async () => ({ id: "plan-1" }),
              },
              member: {
                findMany: async () => [],
              },
              memberPaymentReceipt: {
                update: async (input: unknown) => input,
              },
              memberPaymentReceiptAllocation: {
                findMany: async () => [
                  {
                    amount: 15000,
                    category: "other",
                    contributionPlanId: null,
                    createdAt: new Date("2026-07-08T10:00:00.000Z"),
                    foodPurchaseApplicationId: null,
                    id: "allocation-1",
                    loanId: null,
                    notes: null,
                    periodIntent: "current_period",
                    postedContributionId: null,
                    postedRepaymentId: null,
                    postedShareLedgerEntryId: null,
                    procurementRepaymentScheduleItemId: null,
                    targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
                  },
                ],
              },
            }),
          auditLog: {
            count: async () => 0,
          },
          backfillBatch: {
            count: async () => 0,
            findMany: async () => [],
          },
          contributionPlan: {
            count: async () => 0,
          },
          loan: {
            count: async () => 0,
          },
          member: {
            findMany: async () => [],
          },
          memberPaymentReceipt: {
            findFirst: async () =>
              receiptRow({
                allocations: [
                  {
                    amount: 15000,
                    category: "other",
                    contributionPlanId: null,
                    createdAt: new Date("2026-07-08T10:00:00.000Z"),
                    foodPurchaseApplicationId: null,
                    id: "allocation-1",
                    loanId: null,
                    memberId: "member-1",
                    notes: null,
                    periodIntent: "current_period",
                    postedContributionId: null,
                    postedRepaymentId: null,
                    postedShareLedgerEntryId: null,
                    procurementRepaymentScheduleItemId: null,
                    receiptId: "receipt-1",
                    targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
                    tenantId: "tenant-1",
                  },
                ],
              }),
          },
          user: {
            findFirst: async () => ({ id: "finance-1" }),
          },
        } as never
      )
    ).rejects.toThrow("staged but not yet postable")
  })

  test("approves procurement receipt allocations against repayment schedules", async () => {
    const scheduleUpdates: Record<string, unknown>[] = []
    const requestUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []
    const procurementAllocation = {
      amount: 6000,
      category: "procurement",
      contributionPlanId: null,
      createdAt: new Date("2026-07-08T10:00:00.000Z"),
      id: "allocation-procurement-1",
      loanId: null,
      memberId: "member-1",
      notes: "July procurement installment",
      periodIntent: "current_period",
      postedContributionId: null,
      postedRepaymentId: null,
      postedShareLedgerEntryId: null,
      procurementRepaymentScheduleItemId: "procurement-schedule-1",
      receiptId: "receipt-1",
      targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      tenantId: "tenant-1",
    }

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        count: async () => 0,
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contributionPlan: {
        findFirst: async () => null,
      },
      member: {
        findMany: async () => [],
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            allocations: [procurementAllocation],
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
            totalAmount: 6000,
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [procurementAllocation],
      },
      procurementRepaymentScheduleItem: {
        count: async () => 0,
        findFirst: async () => ({
          amount: 10000,
          id: "procurement-schedule-1",
          paidAmount: 4000,
          procurementRequestId: "procurement-request-1",
        }),
        update: async (input: Record<string, unknown>) => {
          scheduleUpdates.push(input)
          return input
        },
      },
      procurementRequest: {
        updateMany: async (input: Record<string, unknown>) => {
          requestUpdates.push(input)
          return input
        },
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () =>
            receiptRow({
              allocations: [procurementAllocation],
              totalAmount: 6000,
            }),
        },
        procurementRepaymentScheduleItem: {
          count: async (input: Record<string, unknown>) => {
            expect(input).toMatchObject({
              where: {
                id: { in: ["procurement-schedule-1"] },
                memberId: "member-1",
                tenantId: "tenant-1",
              },
            })
            return 1
          },
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(scheduleUpdates).toEqual([
      {
        data: {
          paidAmount: 10000,
          status: "paid",
        },
        where: { id: "procurement-schedule-1" },
      },
    ])
    expect(requestUpdates).toEqual([
      {
        data: { status: "completed" },
        where: {
          id: "procurement-request-1",
          status: "active",
          tenantId: "tenant-1",
        },
      },
    ])
    expect(auditCreates.some((entry) => (entry as any).data.action === "member_payment_receipt.approved")).toBe(true)
  })

  test("approves food purchase receipt allocations against approved applications", async () => {
    const foodPurchaseApplicationUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []
    const foodPurchaseAllocation = {
      amount: 30000,
      category: "food_purchase",
      contributionPlanId: null,
      createdAt: new Date("2026-07-08T10:00:00.000Z"),
      foodPurchaseApplicationId: "food-application-1",
      id: "allocation-food-1",
      loanId: null,
      memberId: "member-1",
      notes: "Food purchase balance",
      periodIntent: "current_period",
      postedContributionId: null,
      postedRepaymentId: null,
      postedShareLedgerEntryId: null,
      procurementRepaymentScheduleItemId: null,
      receiptId: "receipt-1",
      targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      tenantId: "tenant-1",
    }

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        count: async () => 0,
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contributionPlan: {
        findFirst: async () => null,
      },
      foodPurchaseApplication: {
        findFirst: async () => ({
          approvedAmount: 50000,
          id: "food-application-1",
          paidAmount: 20000,
        }),
        update: async (input: Record<string, unknown>) => {
          foodPurchaseApplicationUpdates.push(input)
          return input
        },
      },
      member: {
        findMany: async () => [],
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            allocations: [foodPurchaseAllocation],
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
            totalAmount: 30000,
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [foodPurchaseAllocation],
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        foodPurchaseApplication: {
          count: async (input: Record<string, unknown>) => {
            expect(input).toMatchObject({
              where: {
                id: { in: ["food-application-1"] },
                memberId: "member-1",
                status: "approved",
                tenantId: "tenant-1",
              },
            })
            return 1
          },
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () =>
            receiptRow({
              allocations: [foodPurchaseAllocation],
              totalAmount: 30000,
            }),
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(foodPurchaseApplicationUpdates).toEqual([
      {
        data: {
          paidAmount: 50000,
          paidAt: new Date("2026-07-08T00:00:00.000Z"),
        },
        where: { id: "food-application-1" },
      },
    ])
    expect(auditCreates.some((entry) => (entry as any).data.action === "member_payment_receipt.approved")).toBe(true)
  })

  test("approves project financing receipt allocations against repayable facilities", async () => {
    const projectFinancingUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []
    const projectFinancingAllocation = {
      amount: 250000,
      category: "project_financing",
      contributionPlanId: null,
      createdAt: new Date("2026-07-08T10:00:00.000Z"),
      foodPurchaseApplicationId: null,
      id: "allocation-project-1",
      loanId: null,
      memberId: "member-1",
      notes: "Business funding payback",
      periodIntent: "current_period",
      postedContributionId: null,
      postedRepaymentId: null,
      postedShareLedgerEntryId: null,
      procurementRepaymentScheduleItemId: null,
      projectFinancingRequestId: "project-financing-1",
      receiptId: "receipt-1",
      targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      tenantId: "tenant-1",
    }

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        count: async () => 0,
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contributionPlan: {
        findFirst: async () => null,
      },
      member: {
        findMany: async () => [],
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            allocations: [projectFinancingAllocation],
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
            totalAmount: 250000,
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [projectFinancingAllocation],
      },
      projectFinancingRequest: {
        findFirst: async () => ({
          approvedAmount: 750000,
          id: "project-financing-1",
          paidAmount: 500000,
        }),
        update: async (input: Record<string, unknown>) => {
          projectFinancingUpdates.push(input)
          return input
        },
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () =>
            receiptRow({
              allocations: [projectFinancingAllocation],
              totalAmount: 250000,
            }),
        },
        projectFinancingRequest: {
          count: async (input: Record<string, unknown>) => {
            expect(input).toMatchObject({
              where: {
                approvedStructure: "repayable_facility",
                id: { in: ["project-financing-1"] },
                memberId: "member-1",
                status: { in: ["approved", "active"] },
                tenantId: "tenant-1",
              },
            })
            return 1
          },
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(projectFinancingUpdates).toEqual([
      {
        data: {
          paidAmount: 750000,
          paidAt: new Date("2026-07-08T00:00:00.000Z"),
          status: "completed",
        },
        where: { id: "project-financing-1" },
      },
    ])
    expect(auditCreates.some((entry) => (entry as any).data.action === "member_payment_receipt.approved")).toBe(true)
  })

  test("approves supported receipt allocations through member payment posting", async () => {
    const contributions: Record<string, unknown>[] = []
    const ledgerTransactions: Record<string, unknown>[] = []
    const allocationUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        count: async () => 0,
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contribution: {
        create: async (input: Record<string, unknown>) => {
          contributions.push(input)
          return { id: "contribution-1", ...input }
        },
      },
      contributionPlan: {
        findFirst: async () => ({ id: "plan-1" }),
      },
      ledgerAccount: {
        findUnique: async (input: any) => ({
          id: `account-${input.where.tenantId_code.code}`,
        }),
      },
      ledgerTransaction: {
        create: async (input: Record<string, unknown>) => {
          ledgerTransactions.push(input)
          return input
        },
      },
      loan: {
        count: async () => 0,
      },
      member: {
        findFirst: async () => ({ paymentAllocationPreference: "manual_split" }),
        findMany: async () => [],
        update: async (input: unknown) => input,
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [
          {
            amount: 10000,
            category: "commitment",
            contributionPlanId: null,
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            id: "allocation-1",
            loanId: null,
            notes: null,
            periodIntent: "current_period",
            postedContributionId: null,
            postedRepaymentId: null,
            postedShareLedgerEntryId: null,
            procurementRepaymentScheduleItemId: null,
            targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
          },
          {
            amount: 5000,
            category: "special_savings",
            contributionPlanId: null,
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            id: "allocation-2",
            loanId: null,
            notes: null,
            periodIntent: "future_period",
            postedContributionId: null,
            postedRepaymentId: null,
            postedShareLedgerEntryId: null,
            procurementRepaymentScheduleItemId: null,
            targetPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
          },
        ],
        updateMany: async (input: Record<string, unknown>) => {
          allocationUpdates.push(input)
          return input
        },
      },
      repayment: {
        create: async () => ({ id: "repayment-1" }),
      },
      repaymentScheduleItem: {
        findMany: async () => [],
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () => receiptRow(),
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(contributions).toHaveLength(2)
    expect(contributions[0]).toMatchObject({
      data: {
        amount: 10000,
        committedAmount: 10000,
        contributionPlanId: "plan-1",
        extraSavingsAmount: 0,
        periodLabel: "July 2026 (current)",
      },
    })
    expect(contributions[1]).toMatchObject({
      data: {
        amount: 5000,
        committedAmount: null,
        contributionPlanId: "plan-1",
        extraSavingsAmount: 5000,
        periodLabel: "August 2026 (future)",
      },
    })
    expect(ledgerTransactions).toHaveLength(2)
    expect(allocationUpdates).toHaveLength(2)
    expect(allocationUpdates[0]).toMatchObject({
      data: { postedContributionId: "contribution-1" },
    })
    expect(auditCreates.some((entry) => (entry as any).data.action === "member_payment_receipt.approved")).toBe(true)
  })

  test("waives remaining unpaid loan schedule rows when a receipt payoff clears the loan", async () => {
    const allocationUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []
    const loanUpdates: Record<string, unknown>[] = []
    const scheduleUpdates: Record<string, unknown>[] = []
    const scheduleUpdateMany: Record<string, unknown>[] = []
    let scheduleFindCallCount = 0

    const loanAllocation = {
      amount: 5000,
      category: "loan_extra_payment",
      contributionPlanId: null,
      createdAt: new Date("2026-07-08T10:00:00.000Z"),
      foodPurchaseApplicationId: null,
      id: "allocation-loan-1",
      loanId: "loan-1",
      memberId: "member-1",
      notes: "Final loan payoff",
      periodIntent: "current_period",
      postedContributionId: null,
      postedRepaymentId: null,
      postedShareLedgerEntryId: null,
      procurementRepaymentScheduleItemId: null,
      projectFinancingRequestId: null,
      receiptId: "receipt-1",
      targetPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      tenantId: "tenant-1",
    }

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contributionPlan: {
        findFirst: async () => null,
      },
      ledgerAccount: {
        findUnique: async (input: any) => ({
          id: `account-${input.where.tenantId_code.code}`,
        }),
      },
      ledgerTransaction: {
        create: async (input: Record<string, unknown>) => input,
      },
      loan: {
        count: async () => 0,
        findFirst: async () => ({
          id: "loan-1",
          memberId: "member-1",
          outstandingPrincipal: 5000,
        }),
        update: async (input: Record<string, unknown>) => {
          loanUpdates.push(input)
          return input
        },
      },
      member: {
        findFirst: async () => ({ paymentAllocationPreference: "manual_split" }),
        findMany: async () => [],
        update: async (input: unknown) => input,
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            allocations: [loanAllocation],
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
            totalAmount: 5000,
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [loanAllocation],
        updateMany: async (input: Record<string, unknown>) => {
          allocationUpdates.push(input)
          return input
        },
      },
      repayment: {
        create: async () => ({
          id: "repayment-1",
          paidAt: new Date("2026-07-08T00:00:00.000Z"),
        }),
      },
      repaymentScheduleItem: {
        findMany: async () => {
          scheduleFindCallCount += 1

          if (scheduleFindCallCount === 1) {
            return [
              {
                amountPaid: 0,
                id: "schedule-1",
                installmentNumber: 1,
                totalDue: 5000,
              },
              {
                amountPaid: 0,
                id: "schedule-2",
                installmentNumber: 2,
                totalDue: 15000,
              },
            ]
          }

          return [
            {
              amountPaid: 0,
              id: "schedule-2",
              installmentNumber: 2,
              totalDue: 15000,
            },
          ]
        },
        update: async (input: Record<string, unknown>) => {
          scheduleUpdates.push(input)
          return input
        },
        updateMany: async (input: Record<string, unknown>) => {
          scheduleUpdateMany.push(input)
          return input
        },
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async (input: any) => {
            if (input.where?.id) {
              expect(input).toMatchObject({
                where: {
                  id: { in: ["loan-1"] },
                  memberId: "member-1",
                  tenantId: "tenant-1",
                },
              })
              return 1
            }

            return 0
          },
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () =>
            receiptRow({
              allocations: [loanAllocation],
              totalAmount: 5000,
            }),
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(loanUpdates[0]).toMatchObject({
      data: {
        status: "completed",
      },
      where: { id: "loan-1" },
    })
    expect(scheduleUpdates[0]).toMatchObject({
      data: {
        amountPaid: 5000,
        status: "paid",
      },
      where: { id: "schedule-1" },
    })
    expect(scheduleUpdateMany[0]).toMatchObject({
      data: {
        status: "waived",
      },
      where: {
        id: { in: ["schedule-2"] },
        loanId: "loan-1",
        tenantId: "tenant-1",
      },
    })
    expect(allocationUpdates[0]).toMatchObject({
      data: { postedRepaymentId: "repayment-1" },
    })
    expect(auditCreates).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "loan.early_settled",
          metadata: expect.objectContaining({
            repaymentId: "repayment-1",
            waivedScheduleItemCount: 1,
            waivedScheduleItemIds: ["schedule-2"],
            waivedScheduleOutstandingAmount: 15000,
          }),
        }),
      })
    )
  })

  test("approves share receipt allocations through the member share ledger", async () => {
    const shareLedgerCreates: Record<string, unknown>[] = []
    const allocationUpdates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []
    const shareAllocation = {
      amount: 10000,
      category: "shares",
      contributionPlanId: null,
      createdAt: new Date("2026-07-08T10:00:00.000Z"),
      id: "allocation-share-1",
      loanId: null,
      memberId: "member-1",
      notes: "One optional share",
      periodIntent: "unspecified",
      postedContributionId: null,
      postedRepaymentId: null,
      postedShareLedgerEntryId: null,
      procurementRepaymentScheduleItemId: null,
      receiptId: "receipt-1",
      targetPeriodStart: null,
      tenantId: "tenant-1",
    }

    const tx = {
      ...liveMigrationDelegates(),
      auditLog: {
        count: async () => 0,
        create: async (input: Record<string, unknown>) => {
          auditCreates.push(input)
          return input
        },
      },
      contributionPlan: {
        findFirst: async () => null,
      },
      member: {
        findMany: async () => [],
      },
      memberPaymentReceipt: {
        update: async (input: any) =>
          receiptRow({
            ...input.data,
            allocations: [shareAllocation],
            reviewedAt: new Date("2026-07-08T11:00:00.000Z"),
            reviewedByUserId: "finance-1",
            status: "approved",
            totalAmount: 10000,
          }),
      },
      memberPaymentReceiptAllocation: {
        findMany: async () => [shareAllocation],
        updateMany: async (input: Record<string, unknown>) => {
          allocationUpdates.push(input)
          return input
        },
      },
      memberShareLedgerEntry: {
        create: async (input: Record<string, unknown>) => {
          shareLedgerCreates.push(input)
          return { id: "share-ledger-1", ...input }
        },
      },
    }

    const receipt = await reviewMemberPaymentReceipt(
      {
        actorUserId: "finance-1",
        decision: "approved",
        receiptId: "receipt-1",
        tenantId: "tenant-1",
      },
      {
        ...liveMigrationDelegates(),
        $transaction: async (callback: (transactionClient: unknown) => Promise<unknown>) =>
          callback(tx),
        contributionPlan: {
          count: async () => 0,
        },
        loan: {
          count: async () => 0,
        },
        member: {
          findMany: async () => [],
        },
        memberPaymentReceipt: {
          findFirst: async () =>
            receiptRow({
              allocations: [shareAllocation],
              totalAmount: 10000,
            }),
        },
        user: {
          findFirst: async () => ({ id: "finance-1" }),
        },
      } as never
    )

    expect(receipt.status).toBe("approved")
    expect(shareLedgerCreates).toHaveLength(1)
    expect(shareLedgerCreates[0]).toMatchObject({
      data: {
        amount: 10000,
        createdByUserId: "finance-1",
        memberId: "member-1",
        notes: "Receipt BANK-001 - One optional share",
        sourceId: "allocation-share-1",
        sourceType: "payment_receipt",
        tenantId: "tenant-1",
      },
    })
    expect(allocationUpdates).toEqual([
      {
        data: { postedShareLedgerEntryId: "share-ledger-1" },
        where: { id: "allocation-share-1" },
      },
    ])
    expect(auditCreates.some((entry) => (entry as any).data.action === "member_payment_receipt.approved")).toBe(true)
  })
})
