import { describe, expect, test } from "bun:test"
import {
  applyImportBatch,
  createImportBatch,
  getImportBatchKind,
  importCharges,
  importContributions,
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
      } as never,
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
        } as never,
      ),
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
        prisma as never,
      ),
    ).rejects.toThrow("Member record imports are locked because initial migration is finalized")

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
        prisma as never,
      ),
    ).rejects.toThrow("Member record imports are locked because initial migration is finalized")

    expect(prisma.memberUpserts).toHaveLength(0)
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
        } as never,
      ),
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
      } as never,
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
        } as never,
      ),
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
        } as never,
      ),
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
        } as never,
      ),
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
      } as never,
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
        } as never,
      ),
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
        } as never,
      ),
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
        } as never,
      ),
    ).rejects.toThrow("Member record imports are locked because initial migration is finalized")

    expect(memberUpserts).toHaveLength(0)
    expect(batchUpdates).toHaveLength(0)
  })
})
