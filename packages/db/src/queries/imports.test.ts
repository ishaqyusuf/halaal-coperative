import { describe, expect, test } from "bun:test"
import {
  applyImportBatch,
  createImportBatch,
  getImportBatch,
  getImportBatchKind,
  importCharges,
  importContributions,
  importDeductionSources,
  importLoanProducts,
  importLoanMigrations,
  importMembers,
  importRepaymentMigrations,
} from "./imports"

function createFinalizedImportPrismaStub() {
  const importBatchCreates: unknown[] = []
  const memberUpserts: unknown[] = []
  const transactions: unknown[] = []

  return {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      transactions.push(callback)

      return callback({
        importBatch: {
          create: async (input: unknown) => {
            importBatchCreates.push(input)

            return {
              id: "batch-1",
            }
          },
        },
      })
    },
    importBatchCreates,
    member: {
      upsert: async (input: unknown) => {
        memberUpserts.push(input)

        return input
      },
    },
    memberUpserts,
    tenant: {
      findUnique: async () => ({
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
      }),
    },
    transactions,
  }
}

describe("import batch queries", () => {
  test("rejects duplicate collection-source names before writing", async () => {
    let transactionCalls = 0
    const prisma = {
      $transaction: async () => {
        transactionCalls += 1
      },
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
      tenant: {
        findUnique: async () => ({ initialMigrationStatus: "in_progress" }),
      },
    }

    await expect(
      importDeductionSources(
        {
          actorUserId: "user-1",
          rows: [
            { name: "Kaduna Payroll", type: "ministry_payroll" },
            { name: "kaduna payroll", type: "bank_transfer" },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Remove duplicate collection-source names")

    expect(transactionCalls).toBe(0)
  })

  test("imports collection sources atomically with created and updated audit ids", async () => {
    const creates: unknown[] = []
    const updates: unknown[] = []
    const auditEntries: unknown[] = []
    const tx = {
      auditLog: {
        create: async (input: unknown) => {
          auditEntries.push(input)
          return input
        },
      },
      deductionSource: {
        create: async (input: unknown) => {
          creates.push(input)
          return { id: "source-created" }
        },
        findMany: async () => [
          {
            _count: { collectionSourceContributionBatches: 0 },
            externalReference: "OLD",
            id: "source-existing",
            name: "Existing desk",
            type: "manual",
          },
        ],
        update: async (input: unknown) => {
          updates.push(input)
          return { id: "source-existing" }
        },
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
      tenant: {
        findUnique: async () => ({ initialMigrationStatus: "in_progress" }),
      },
    }

    const result = await importDeductionSources(
      {
        actorUserId: "user-1",
        rows: [
          {
            externalReference: "NEW",
            name: "Existing desk",
            type: "employer_payroll",
          },
          {
            externalReference: "CASH-1",
            name: "Cash desk",
            type: "cash",
          },
        ],
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(result).toEqual({ processed: 2 })
    expect(creates).toHaveLength(1)
    expect(updates).toHaveLength(1)
    expect(auditEntries[0]).toMatchObject({
      data: {
        metadata: {
          createdIds: ["source-created"],
          processed: 2,
          updatedIds: ["source-existing"],
        },
      },
    })
  })

  test("protects collection-source meaning after contribution batches exist", async () => {
    let updateCalls = 0
    const tx = {
      deductionSource: {
        findMany: async () => [
          {
            _count: { collectionSourceContributionBatches: 1 },
            externalReference: "PAY-OLD",
            id: "source-existing",
            name: "Payroll desk",
            type: "ministry_payroll",
          },
        ],
        update: async () => {
          updateCalls += 1
        },
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
      tenant: {
        findUnique: async () => ({ initialMigrationStatus: "in_progress" }),
      },
    }

    await expect(
      importDeductionSources(
        {
          actorUserId: "user-1",
          rows: [
            {
              externalReference: "PAY-NEW",
              name: "Payroll desk",
              type: "employer_payroll",
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already has collection batches")

    expect(updateCalls).toBe(0)
  })

  test("returns one tenant-scoped import batch for URL-owned review", async () => {
    const batch = await getImportBatch(
      {
        batchId: "batch-1",
        tenantId: "tenant-1",
      },
      {
        importBatch: {
          findFirst: async (input: unknown) => {
            expect(input).toMatchObject({
              where: {
                id: "batch-1",
                tenantId: "tenant-1",
              },
            })

            return {
              id: "batch-1",
              importType: "members",
            }
          },
        },
      } as never
    )

    expect(batch.id).toBe("batch-1")
  })

  test("returns the staged import batch kind", async () => {
    const importType = await getImportBatchKind(
      {
        batchId: "batch-1",
        tenantId: "tenant-1",
      },
      {
        importBatch: {
          findFirst: async (input: unknown) => {
            expect(input).toMatchObject({
              select: {
                importType: true,
              },
              where: {
                id: "batch-1",
                tenantId: "tenant-1",
              },
            })

            return {
              importType: "charges",
            }
          },
        },
      } as never
    )

    expect(importType).toBe("charges")
  })

  test("throws when the staged import batch cannot be found", async () => {
    await expect(
      getImportBatchKind(
        {
          batchId: "missing-batch",
          tenantId: "tenant-1",
        },
        {
          importBatch: {
            findFirst: async () => null,
          },
        } as never
      )
    ).rejects.toThrow("Import batch not found")
  })

  test("blocks staged import creation after migration finalization", async () => {
    const prisma = createFinalizedImportPrismaStub()

    await expect(
      createImportBatch(
        {
          actorUserId: "user-1",
          duplicateRowCount: 0,
          existingMatchCount: 0,
          importType: "members",
          rows: [
            {
              duplicateInFile: false,
              existingMatch: false,
              payload: { memberNumber: "MBR-001" },
              rowIndex: 1,
            },
          ],
          sourceCsv: "memberNumber\nMBR-001",
          tenantId: "tenant-1",
          validRows: 1,
        },
        prisma as never
      )
    ).rejects.toThrow(
      "Member record imports are locked because initial migration is finalized"
    )

    expect(prisma.transactions).toHaveLength(0)
    expect(prisma.importBatchCreates).toHaveLength(0)
  })

  test("blocks direct member imports after migration finalization", async () => {
    const prisma = createFinalizedImportPrismaStub()

    await expect(
      importMembers(
        {
          actorUserId: "user-1",
          rows: [
            {
              fullName: "Aisha Bello",
              joinedAt: new Date("2025-01-01T00:00:00.000Z"),
              memberNumber: "MBR-001",
              memberType: "individual",
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow(
      "Member record imports are locked because initial migration is finalized"
    )

    expect(prisma.memberUpserts).toHaveLength(0)
  })

  test("imports loan product codes as normalized identifiers", async () => {
    const loanProductCreates: unknown[] = []
    const tx = {
      auditLog: {
        create: async (input: unknown) => input,
      },
      loanProduct: {
        create: async (input: unknown) => {
          loanProductCreates.push(input)
          return { id: "product-created" }
        },
        findMany: async () => [],
      },
    }

    await importLoanProducts(
      {
        actorUserId: "user-1",
        rows: [
          {
            code: "emg",
            loanType: "quick",
            maxSavingsMultiple: 1,
            name: "Emergency Support",
            termMonths: 6,
          },
        ],
        tenantId: "tenant-1",
      },
      {
        $transaction: async (
          callback: (value: typeof tx) => Promise<unknown>
        ) => callback(tx),
        appliedBackfillMonth: {
          findMany: async () => [],
        },
        backfillBatch: {
          findMany: async () => [],
        },
      } as never
    )

    expect(loanProductCreates[0]).toMatchObject({
      data: {
        code: "EMG",
        name: "Emergency Support",
      },
    })
  })

  test("rejects invalid loan product policy values before writing", async () => {
    let transactionCalls = 0
    const prisma = {
      $transaction: async () => {
        transactionCalls += 1
      },
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
    }

    await expect(
      importLoanProducts(
        {
          actorUserId: "user-1",
          rows: [
            {
              code: "BAD",
              loanType: "normal",
              maxSavingsMultiple: 0,
              name: "Invalid product",
              termMonths: 1.5,
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("positive whole number")

    expect(transactionCalls).toBe(0)
  })

  test("rejects duplicate loan product codes before writing", async () => {
    let transactionCalls = 0
    const prisma = {
      $transaction: async () => {
        transactionCalls += 1
      },
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
    }

    await expect(
      importLoanProducts(
        {
          actorUserId: "user-1",
          rows: [
            {
              code: "NOR",
              loanType: "normal",
              maxSavingsMultiple: 2,
              name: "Standard",
              termMonths: 12,
            },
            {
              code: "nor",
              loanType: "quick",
              maxSavingsMultiple: 1,
              name: "Express",
              termMonths: 3,
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("duplicate loan-product codes")

    expect(transactionCalls).toBe(0)
  })

  test("protects loan product policy after loan records exist", async () => {
    let updateCalls = 0
    const tx = {
      loanProduct: {
        findMany: async () => [
          {
            _count: { loanRequests: 1, loans: 0 },
            code: "NOR",
            id: "product-existing",
            isActive: true,
            loanType: "normal",
            maxSavingsMultiple: 2,
            name: "Standard",
            termMonths: 12,
          },
        ],
        update: async () => {
          updateCalls += 1
        },
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
    }

    await expect(
      importLoanProducts(
        {
          actorUserId: "user-1",
          rows: [
            {
              code: "NOR",
              loanType: "normal",
              maxSavingsMultiple: 3,
              name: "Standard",
              termMonths: 18,
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already used by loan records")

    expect(updateCalls).toBe(0)
  })

  test("rejects ambiguous case-only loan product identities already in storage", async () => {
    const tx = {
      loanProduct: {
        findMany: async () => [
          {
            _count: { loanRequests: 0, loans: 0 },
            code: "NOR-1",
            id: "product-1",
            isActive: true,
            loanType: "normal",
            maxSavingsMultiple: 2,
            name: "Standard Loan",
            termMonths: 12,
          },
          {
            _count: { loanRequests: 0, loans: 0 },
            code: "NOR-2",
            id: "product-2",
            isActive: true,
            loanType: "normal",
            maxSavingsMultiple: 2,
            name: "standard loan",
            termMonths: 12,
          },
        ],
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
    }

    await expect(
      importLoanProducts(
        {
          actorUserId: "user-1",
          rows: [
            {
              code: "NOR-1",
              loanType: "normal",
              maxSavingsMultiple: 2,
              name: "Standard Loan",
              termMonths: 12,
            },
          ],
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("ambiguous after case normalization")
  })

  test("applies loan-product rows and batch status in one transaction", async () => {
    const transactionBatchUpdates: unknown[] = []
    const transactionBatchClaims: unknown[] = []
    const productCreates: unknown[] = []
    const outsideBatchUpdates: unknown[] = []
    const tx = {
      auditLog: { create: async (input: unknown) => input },
      importBatch: {
        update: async (input: unknown) => {
          transactionBatchUpdates.push(input)
          return input
        },
        updateMany: async (input: unknown) => {
          transactionBatchClaims.push(input)
          return { count: 1 }
        },
      },
      loanProduct: {
        create: async (input: unknown) => {
          productCreates.push(input)
          return { id: "product-created" }
        },
        findMany: async () => [],
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
      importBatch: {
        findFirst: async () => ({
          id: "batch-1",
          importType: "loan_products",
          rows: [
            {
              payload: {
                code: "NOR",
                loanType: "normal",
                maxSavingsMultiple: 2,
                name: "Standard",
                termMonths: 12,
              },
            },
          ],
          status: "draft",
        }),
        updateMany: async (input: unknown) => {
          outsideBatchUpdates.push(input)
          return { count: 0 }
        },
      },
    }

    await expect(
      applyImportBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).resolves.toEqual({ processed: 1 })

    expect(productCreates).toHaveLength(1)
    expect(transactionBatchClaims).toHaveLength(1)
    expect(transactionBatchClaims[0]).toMatchObject({
      where: { id: "batch-1", status: { in: ["draft", "failed"] } },
    })
    expect(transactionBatchUpdates).toHaveLength(1)
    expect(transactionBatchUpdates[0]).toMatchObject({
      data: { status: "applied" },
    })
    expect(outsideBatchUpdates).toHaveLength(0)
  })

  test("does not reapply a loan-product batch that another request claimed", async () => {
    let productLookups = 0
    const failureUpdates: unknown[] = []
    const tx = {
      importBatch: {
        updateMany: async () => ({ count: 0 }),
      },
      loanProduct: {
        findMany: async () => {
          productLookups += 1
          return []
        },
      },
    }
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      appliedBackfillMonth: { findMany: async () => [] },
      backfillBatch: { findMany: async () => [] },
      importBatch: {
        findFirst: async () => ({
          id: "batch-1",
          importType: "loan_products",
          rows: [],
          status: "draft",
        }),
        updateMany: async (input: unknown) => {
          failureUpdates.push(input)
          return { count: 0 }
        },
      },
    }

    await expect(
      applyImportBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("already been applied or is being applied")

    expect(productLookups).toBe(0)
    expect(failureUpdates[0]).toMatchObject({
      where: { id: "batch-1", status: { not: "applied" } },
    })
  })

  test("blocks member imports after backfill has started", async () => {
    const memberUpserts: unknown[] = []

    await expect(
      importMembers(
        {
          actorUserId: "user-1",
          rows: [
            {
              fullName: "Aisha Bello",
              joinedAt: new Date("2025-01-01T00:00:00.000Z"),
              memberNumber: "MBR-001",
              memberType: "individual",
            },
          ],
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [{ id: "applied-month-1" }],
          },
          backfillBatch: {
            findMany: async () => [],
          },
          member: {
            upsert: async (input: unknown) => {
              memberUpserts.push(input)
              return input
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")
    expect(memberUpserts).toHaveLength(0)
  })

  test("imports member opening savings and KYC references", async () => {
    const memberUpserts: unknown[] = []

    await importMembers(
      {
        actorUserId: "user-1",
        rows: [
          {
            address: "Kaduna",
            email: "aisha@example.com",
            fullName: "Aisha Bello",
            governmentIdNumber: "NIN-001",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            kycDocumentType: "national_id",
            kycReviewNotes: "Imported file",
            kycStatus: "verified",
            memberNumber: "MBR-001",
            memberType: "individual",
            occupation: "Trader",
            openingSavingsBalance: 25000,
            phoneNumber: "+2348010001001",
          },
        ],
        tenantId: "tenant-1",
      },
      {
        appliedBackfillMonth: {
          findMany: async () => [],
        },
        auditLog: {
          create: async (input: unknown) => input,
        },
        backfillBatch: {
          findMany: async () => [],
        },
        member: {
          upsert: async (input: unknown) => {
            memberUpserts.push(input)
            return input
          },
        },
      } as never
    )

    expect(memberUpserts[0]).toMatchObject({
      create: {
        address: "Kaduna",
        email: "aisha@example.com",
        governmentIdNumber: "NIN-001",
        kycDocumentType: "national_id",
        kycReviewNotes: "Imported file",
        kycStatus: "verified",
        occupation: "Trader",
        phoneNumber: "+2348010001001",
        totalSavingsSnapshot: 25000,
      },
      update: {
        address: "Kaduna",
        email: "aisha@example.com",
        governmentIdNumber: "NIN-001",
        kycDocumentType: "national_id",
        kycReviewNotes: "Imported file",
        kycStatus: "verified",
        occupation: "Trader",
        phoneNumber: "+2348010001001",
        totalSavingsSnapshot: 25000,
      },
    })
  })

  test("blocks contribution imports after backfill has started", async () => {
    const memberLookups: unknown[] = []

    await expect(
      importContributions(
        {
          actorUserId: "user-1",
          rows: [
            {
              amount: 1000,
              channel: "manual",
              memberNumber: "MBR-001",
              postedAt: new Date("2025-02-01T00:00:00.000Z"),
            },
          ],
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [],
          },
          backfillBatch: {
            findMany: async () => [{ id: "applied-batch-1" }],
          },
          member: {
            findFirst: async (input: unknown) => {
              memberLookups.push(input)
              return null
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")
    expect(memberLookups).toHaveLength(0)
  })

  test("blocks charge imports after backfill has started", async () => {
    const chargeDefinitionUpserts: unknown[] = []

    await expect(
      importCharges(
        {
          actorUserId: "user-1",
          rows: [
            {
              amount: 250,
              assessedAt: new Date("2025-02-01T00:00:00.000Z"),
              code: "DEV",
              kind: "fixed",
              memberNumber: "MBR-001",
              name: "Development levy",
            },
          ],
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [{ id: "applied-month-1" }],
          },
          backfillBatch: {
            findMany: async () => [],
          },
          chargeDefinition: {
            upsert: async (input: unknown) => {
              chargeDefinitionUpserts.push(input)
              return input
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")
    expect(chargeDefinitionUpserts).toHaveLength(0)
  })

  test("blocks loan migration imports after backfill has started", async () => {
    const loanProductUpserts: unknown[] = []

    await expect(
      importLoanMigrations(
        {
          actorUserId: "user-1",
          rows: [
            {
              loanProductName: "Legacy normal loan",
              loanType: "normal",
              memberNumber: "MBR-001",
              outstandingPrincipal: 5000,
              principalAmount: 10000,
              requestedAt: new Date("2025-02-01T00:00:00.000Z"),
              status: "active",
              termMonths: 10,
            },
          ],
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [{ id: "applied-month-1" }],
          },
          backfillBatch: {
            findMany: async () => [],
          },
          loanProduct: {
            upsert: async (input: unknown) => {
              loanProductUpserts.push(input)
              return input
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")
    expect(loanProductUpserts).toHaveLength(0)
  })

  test("uses imported monthly repayment amount for loan migration schedules", async () => {
    const loanRequests: any[] = []
    const loans: any[] = []
    const repaymentScheduleCreates: any[] = []

    const result = await importLoanMigrations(
      {
        actorUserId: "user-1",
        rows: [
          {
            firstRepaymentDueAt: new Date("2025-02-01T00:00:00.000Z"),
            loanProductName: "Legacy normal loan",
            loanType: "normal",
            memberNumber: "MBR-001",
            monthlyRepaymentAmount: 15000,
            outstandingPrincipal: 60000,
            principalAmount: 120000,
            requestedAt: new Date("2025-01-01T00:00:00.000Z"),
            status: "active",
            termMonths: 12,
          },
        ],
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            loan: {
              create: async (input: any) => {
                loans.push(input)
                return { id: "loan-1" }
              },
            },
            loanApproval: {
              create: async () => ({ id: "approval-1" }),
            },
            loanRequest: {
              create: async (input: any) => {
                loanRequests.push(input)
                return { id: "request-1" }
              },
            },
            repaymentScheduleItem: {
              createMany: async (input: any) => {
                repaymentScheduleCreates.push(input)
                return { count: input.data.length }
              },
            },
          }),
        appliedBackfillMonth: {
          findMany: async () => [],
        },
        auditLog: {
          create: async () => ({ id: "audit-1" }),
        },
        backfillBatch: {
          findMany: async () => [],
        },
        loanProduct: {
          upsert: async () => ({ id: "product-1" }),
        },
        member: {
          findFirst: async () => ({
            id: "member-1",
            memberNumber: "MBR-001",
            totalSavingsSnapshot: 200000,
          }),
        },
        tenant: {
          findUnique: async () => ({
            initialMigrationStatus: "historical_setup_in_progress",
            migrationFinalizedAt: null,
          }),
        },
      } as never
    )

    expect(result.processed).toBe(1)
    expect(loanRequests[0]?.data.estimatedMonthlyServicing).toBe(15000)
    expect(loans[0]?.data.estimatedMonthlyServicing).toBe(15000)
    expect(repaymentScheduleCreates[0]?.data[0]).toMatchObject({
      amountPaid: 15000,
      principalDue: 15000,
      status: "paid",
      totalDue: 15000,
    })
  })

  test("blocks repayment migration imports after backfill has started", async () => {
    const loanLookups: unknown[] = []

    await expect(
      importRepaymentMigrations(
        {
          actorUserId: "user-1",
          rows: [
            {
              amount: 1500,
              loanProductName: "Legacy normal loan",
              memberNumber: "MBR-001",
            },
          ],
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [],
          },
          backfillBatch: {
            findMany: async () => [{ id: "applied-batch-1" }],
          },
          loan: {
            findFirst: async (input: unknown) => {
              loanLookups.push(input)
              return null
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")
    expect(loanLookups).toHaveLength(0)
  })

  test("blocks applying a staged member import after backfill has started", async () => {
    const memberUpserts: unknown[] = []
    const batchUpdates: unknown[] = []

    await expect(
      applyImportBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          tenantId: "tenant-1",
        },
        {
          appliedBackfillMonth: {
            findMany: async () => [{ id: "applied-month-1" }],
          },
          backfillBatch: {
            findMany: async () => [],
          },
          importBatch: {
            findFirst: async (input: unknown) => {
              expect(input).toMatchObject({
                where: {
                  id: "batch-1",
                  tenantId: "tenant-1",
                },
              })

              return {
                id: "batch-1",
                importType: "members",
                rows: [
                  {
                    payload: {
                      fullName: "Aisha Bello",
                      joinedAt: new Date("2025-01-01T00:00:00.000Z"),
                      memberNumber: "MBR-001",
                      memberType: "individual",
                    },
                  },
                ],
                status: "draft",
              }
            },
            update: async (input: unknown) => {
              batchUpdates.push(input)
              return input
            },
          },
          member: {
            upsert: async (input: unknown) => {
              memberUpserts.push(input)
              return input
            },
          },
        } as never
      )
    ).rejects.toThrow("Member record imports are locked")

    expect(memberUpserts).toHaveLength(0)
    expect(batchUpdates).toHaveLength(0)
  })

  test("blocks applying a staged import after migration finalization without updating the batch", async () => {
    const memberUpserts: unknown[] = []
    const batchUpdates: unknown[] = []

    await expect(
      applyImportBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          tenantId: "tenant-1",
        },
        {
          importBatch: {
            findFirst: async () => ({
              id: "batch-1",
              importType: "members",
              rows: [
                {
                  payload: {
                    fullName: "Aisha Bello",
                    joinedAt: new Date("2025-01-01T00:00:00.000Z"),
                    memberNumber: "MBR-001",
                    memberType: "individual",
                  },
                },
              ],
              status: "draft",
            }),
            update: async (input: unknown) => {
              batchUpdates.push(input)
              return input
            },
          },
          member: {
            upsert: async (input: unknown) => {
              memberUpserts.push(input)
              return input
            },
          },
          tenant: {
            findUnique: async () => ({
              initialMigrationStatus: "live_operations",
              migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
            }),
          },
        } as never
      )
    ).rejects.toThrow(
      "Member record imports are locked because initial migration is finalized"
    )

    expect(memberUpserts).toHaveLength(0)
    expect(batchUpdates).toHaveLength(0)
  })
})
