import { describe, expect, test } from "bun:test"
import {
  applyApplicableWorkflowCharges,
  applyLoanRequestCharges,
  applyCharge,
  createChargeDefinition,
  getApplicableChargeQuoteHash,
  reverseChargeApplication,
  settleChargeApplication,
  updateChargeDefinition,
  waiveChargeApplication,
  type ChargeQuote,
} from "./charges"

test("reviewed charge fingerprint changes with amount and collection terms", () => {
  const charge: ChargeQuote = {
    amount: 125.5,
    basisAmount: 1000,
    chargeApplicabilityId: "applicability-1",
    chargeDefinitionId: "definition-1",
    chargeValueType: "fixed_amount",
    code: "PROJECT_REVIEW",
    collectionMode: "pay_separately",
    effectiveAmount: 125.5,
    isRequired: true,
    name: "Project review",
    purpose: "general",
    trigger: "submission",
    workflow: "project_financing_request",
  }
  const reviewedHash = getApplicableChargeQuoteHash([charge], 1000)

  expect(reviewedHash).toMatch(/^[a-f0-9]{64}$/)
  expect(getApplicableChargeQuoteHash([charge], 1000)).toBe(reviewedHash)
  expect(getApplicableChargeQuoteHash([charge], 1001)).not.toBe(reviewedHash)
  expect(
    getApplicableChargeQuoteHash([{ ...charge, amount: 126 }], 1000)
  ).not.toBe(reviewedHash)
  expect(
    getApplicableChargeQuoteHash(
      [{ ...charge, collectionMode: "deduct_from_savings" }],
      1000
    )
  ).not.toBe(reviewedHash)
})

function createChargePrismaStub({
  appliedBackfillBatches = 0,
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  appliedBackfillBatches?: number
  initialMigrationStatus?: string
} = {}) {
  const chargeDefinitionCreates: unknown[] = []
  const chargeDefinitionLookups: unknown[] = []
  const chargeDefinitionUpdates: unknown[] = []
  const chargeDefinitionVersionCreates: unknown[] = []
  const chargeApplicabilityCreates: unknown[] = []
  const chargeApplicabilityDeletes: unknown[] = []
  const chargeApplicabilityUpdates: unknown[] = []
  const ledgerLookups: unknown[] = []

  const tx = {
    chargeApplicability: {
      createMany: async (input: unknown) => {
        chargeApplicabilityCreates.push(input)
        return input
      },
      deleteMany: async (input: unknown) => {
        chargeApplicabilityDeletes.push(input)
        return input
      },
      updateMany: async (input: unknown) => {
        chargeApplicabilityUpdates.push(input)
        return input
      },
    },
    chargeDefinition: {
      create: async (input: unknown) => {
        chargeDefinitionCreates.push(input)

        return {
          id: "charge-definition-1",
        }
      },
      findFirst: async () => ({
        id: "charge-definition-1",
        amount: 100,
        chargeValueType: "fixed_amount",
        kind: "fixed",
      }),
      update: async (input: unknown) => {
        chargeDefinitionUpdates.push(input)

        return {
          id: "charge-definition-1",
        }
      },
    },
    chargeDefinitionVersion: {
      create: async (input: unknown) => {
        chargeDefinitionVersionCreates.push(input)
        return input
      },
      findFirst: async () => ({
        amount: 150,
        chargeValueType: "fixed_amount",
        kind: "fixed",
      }),
    },
    ledgerAccount: {
      findUnique: async (input: unknown) => {
        ledgerLookups.push(input)
        return null
      },
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    backfillBatch: {
      count: async () => appliedBackfillBatches,
      findMany: async () => [],
    },
    chargeDefinition: {
      findFirst: async (input: unknown) => {
        chargeDefinitionLookups.push(input)
        return null
      },
    },
    chargeDefinitionVersion: {
      count: async () => 1,
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
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "finalized" ||
          initialMigrationStatus === "live_operations"
            ? new Date("2026-01-31T00:00:00.000Z")
            : null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    chargeDefinitionCreates,
    chargeApplicabilityCreates,
    chargeApplicabilityDeletes,
    chargeApplicabilityUpdates,
    chargeDefinitionLookups,
    chargeDefinitionUpdates,
    chargeDefinitionVersionCreates,
    ledgerLookups,
  }
}

function createLoanRequestChargePrismaStub(
  definitions: Array<{
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    effectiveFrom?: Date
    id: string
    kind: "fixed" | "percentage"
    name?: string
    workflowCollectionMode?: "deduct_from_savings" | "pay_separately"
  }>
) {
  const chargeApplicationCreates: any[] = []
  const chargeApplicationFindFirstCalls: unknown[] = []

  const tx = {
    auditLog: {
      create: async (input: unknown) => input,
    },
    chargeApplication: {
      create: async (input: any) => {
        const application = {
          id: `charge-application-${chargeApplicationCreates.length + 1}`,
          ...input.data,
        }
        chargeApplicationCreates.push(input)
        return application
      },
      findFirst: async (input: unknown) => {
        chargeApplicationFindFirstCalls.push(input)
        return null
      },
    },
    chargeApplicability: {
      findMany: async (input: any) =>
        definitions
          .filter((definition) => definition.workflowCollectionMode)
          .map((definition) => {
            const effectiveFrom =
              definition.effectiveFrom ?? new Date("2025-01-01T00:00:00.000Z")
            const assessedAt =
              input.include.chargeDefinition.include.versions.where
                .effectiveFrom.lte

            return {
              chargeDefinition: {
                code: definition.id.toUpperCase(),
                id: definition.id,
                isActive: true,
                name: definition.name ?? "Workflow charge",
                purpose: "loan_fee",
                versions:
                  effectiveFrom <= assessedAt
                    ? [
                        {
                          amount: definition.amount,
                          chargeValueType: definition.chargeValueType,
                          createdAt: effectiveFrom,
                          effectiveFrom,
                          kind: definition.kind,
                        },
                      ]
                    : [],
              },
              collectionMode: definition.workflowCollectionMode,
              id: `applicability-${definition.id}`,
              isRequired: true,
            }
          }),
    },
    chargeDefinition: {
      findFirst: async (input: any) => {
        const id = input.where.id
        const definition = definitions.find((item) => item.id === id)

        return definition
          ? {
              id: definition.id,
              isMonthlyLevy: false,
              name: definition.name ?? "Loan fee",
              purpose: "loan_fee",
            }
          : null
      },
      findMany: async (input: any) =>
        definitions.map((definition) => {
          const effectiveFrom =
            definition.effectiveFrom ?? new Date("2025-01-01T00:00:00.000Z")
          const assessedAt = input.include.versions.where.effectiveFrom.lte

          return {
            appliesToLoanRequests: true,
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
            id: definition.id,
            isActive: true,
            name: definition.name ?? "Loan fee",
            purpose: "loan_fee",
            versions:
              effectiveFrom <= assessedAt
                ? [
                    {
                      amount: definition.amount,
                      chargeValueType: definition.chargeValueType,
                      createdAt: effectiveFrom,
                      effectiveFrom,
                      kind: definition.kind,
                    },
                  ]
                : [],
          }
        }),
    },
    ledgerAccount: {
      findUnique: async (input: any) => ({
        id: `ledger-${input.where.tenantId_code.code}`,
      }),
    },
    ledgerTransaction: {
      create: async (input: unknown) => input,
    },
    member: {
      update: async (input: unknown) => input,
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    chargeApplicationCreates,
    chargeApplicationFindFirstCalls,
  }
}

function createChargeLifecyclePrismaStub(input: {
  collectionMode: "deduct_from_savings" | "pay_separately"
  isMonthlyLevy?: boolean
  purpose?: string
  status: "pending" | "posted"
}) {
  const ledgerTransactions: any[] = []
  const memberUpdates: any[] = []
  const auditLogs: any[] = []
  const application = {
    amount: 12_000,
    chargeDefinition: {
      isMonthlyLevy: input.isMonthlyLevy ?? false,
      name: "Operations fee",
      purpose: input.purpose ?? "general",
    },
    collectionMode: input.collectionMode,
    id: "charge-application-1",
    memberId: "member-1",
    notes: null,
    status: input.status,
  }
  const tx = {
    auditLog: {
      create: async (value: any) => {
        auditLogs.push(value)
        return value
      },
    },
    chargeApplication: {
      findFirst: async () => ({ ...application }),
      updateMany: async (value: any) => {
        if (
          value.where.id !== application.id ||
          value.where.tenantId !== "tenant-1" ||
          value.where.status !== application.status
        )
          return { count: 0 }
        Object.assign(application, value.data)
        return { count: 1 }
      },
      update: async (value: any) => ({ ...application, ...value.data }),
    },
    ledgerAccount: {
      findUnique: async (value: any) => ({
        id: `account-${value.where.tenantId_code.code}`,
      }),
    },
    ledgerTransaction: {
      create: async (value: any) => {
        const transaction = {
          id: `ledger-${ledgerTransactions.length + 1}`,
          ...value.data,
        }
        ledgerTransactions.push(value)
        return transaction
      },
      findFirst: async () => null,
    },
    member: {
      update: async (value: any) => {
        memberUpdates.push(value)
        return value
      },
    },
  }
  return {
    $transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
      callback(tx),
    auditLogs,
    ledgerTransactions,
    memberUpdates,
  }
}

describe("charge migration guards", () => {
  test("rejects non-positive manual charge amounts before any financial write", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 0,
          assessedAt: new Date("2025-01-10T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          sourceType: "backfill",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Charge amount must be a positive number")
  })

  test("blocks backdated charge setup after migration finalization", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "finalized",
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live charge definition updates cannot be backdated")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("allows new live charge definitions after go-live when not backdated", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await createChargeDefinition(
      {
        amount: 100,
        code: "ADMIN",
        effectiveFrom: new Date("2099-01-01T00:00:00.000Z"),
        kind: "fixed",
        name: "Admin levy",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeDefinitionCreates).toHaveLength(1)
    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(1)
  })

  test("generates an internal code when staff create a charge by name", async () => {
    const prisma = createChargePrismaStub()

    await createChargeDefinition(
      {
        amount: 100,
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        kind: "fixed",
        name: "Admin levy",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeDefinitionCreates[0]?.data.code).toMatch(
      /^charge-[a-f0-9]{12}$/
    )
  })

  test("normalizes loan fee definitions to one-time loan request charges", async () => {
    const prisma = createChargePrismaStub()

    await createChargeDefinition(
      {
        amount: 2500,
        appliesToMembers: true,
        code: "LOAN-FEE",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        kind: "fixed",
        name: "Loan application fee",
        purpose: "loan_fee",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeDefinitionCreates[0]).toMatchObject({
      data: {
        appliesToLoanRequests: true,
        appliesToMembers: false,
        chargeFrequency: "one_time",
        purpose: "loan_fee",
      },
    })
  })

  test("persists explicit workflow applicability for charge definitions", async () => {
    const prisma = createChargePrismaStub()

    await createChargeDefinition(
      {
        amount: 1500,
        applicability: [
          {
            collectionMode: "pay_separately",
            trigger: "submission",
            workflow: "procurement_request",
          },
          {
            collectionMode: "deduct_from_savings",
            trigger: "submission",
            workflow: "food_purchase_application",
          },
        ],
        code: "OPS",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        kind: "fixed",
        name: "Operations fee",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeApplicabilityDeletes).toHaveLength(1)
    expect(prisma.chargeApplicabilityCreates[0]).toMatchObject({
      data: [
        {
          chargeDefinitionId: "charge-definition-1",
          collectionMode: "pay_separately",
          tenantId: "tenant-1",
          trigger: "submission",
          workflow: "procurement_request",
        },
        {
          chargeDefinitionId: "charge-definition-1",
          collectionMode: "deduct_from_savings",
          tenantId: "tenant-1",
          trigger: "submission",
          workflow: "food_purchase_application",
        },
      ],
    })
  })

  test("blocks backdated live charge definitions after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot be backdated")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("blocks live charge application before live operations", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.chargeDefinitionLookups).toHaveLength(0)
    expect(prisma.ledgerLookups).toHaveLength(0)
  })

  test("blocks historical charge setup after member backfill starts", async () => {
    const prisma = createChargePrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("member ledger backfill has already started")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("allows live charge activation changes after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await updateChargeDefinition(
      "tenant-1",
      "charge-definition-1",
      {
        isActive: false,
      },
      prisma as never
    )

    expect(prisma.chargeDefinitionUpdates).toHaveLength(1)
    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(0)
  })

  test("blocks backdated live charge amount updates after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await expect(
      updateChargeDefinition(
        "tenant-1",
        "charge-definition-1",
        {
          amount: 150,
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        },
        prisma as never
      )
    ).rejects.toThrow("cannot be backdated")

    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(0)
  })

  test("allows backfill charge posting through the live-write guard", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          sourceType: "backfill",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
  })

  test("allows import charge posting through the live-write guard", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          sourceType: "import",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
  })

  test("posts fixed loan request charges from the effective version", async () => {
    const prisma = createLoanRequestChargePrismaStub([
      {
        amount: 2500,
        chargeValueType: "fixed_amount",
        id: "loan-charge-1",
        kind: "fixed",
      },
    ])

    await applyLoanRequestCharges(
      {
        actorUserId: "user-1",
        assessedAt: new Date("2025-02-01T00:00:00.000Z"),
        loanRequestId: "loan-request-1",
        memberId: "member-1",
        requestedAmount: 100000,
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeApplicationCreates[0]).toMatchObject({
      data: {
        amount: 2500,
        chargeDefinitionId: "loan-charge-1",
        loanRequestId: "loan-request-1",
        memberId: "member-1",
      },
    })
  })

  test("posts percentage loan request charges against requested amount", async () => {
    const prisma = createLoanRequestChargePrismaStub([
      {
        amount: 2.5,
        chargeValueType: "percentage",
        id: "loan-charge-1",
        kind: "percentage",
      },
    ])

    await applyLoanRequestCharges(
      {
        actorUserId: "user-1",
        assessedAt: new Date("2025-02-01T00:00:00.000Z"),
        loanRequestId: "loan-request-1",
        memberId: "member-1",
        requestedAmount: 120000,
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeApplicationCreates[0]).toMatchObject({
      data: {
        amount: 3000,
        chargeDefinitionId: "loan-charge-1",
      },
    })
  })

  test("ignores future-dated loan request charge versions", async () => {
    const prisma = createLoanRequestChargePrismaStub([
      {
        amount: 2500,
        chargeValueType: "fixed_amount",
        effectiveFrom: new Date("2025-03-01T00:00:00.000Z"),
        id: "loan-charge-1",
        kind: "fixed",
      },
    ])

    await applyLoanRequestCharges(
      {
        actorUserId: "user-1",
        assessedAt: new Date("2025-02-01T00:00:00.000Z"),
        loanRequestId: "loan-request-1",
        memberId: "member-1",
        requestedAmount: 100000,
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.chargeApplicationCreates).toHaveLength(0)
  })

  test("stages pay-separately workflow charges without ledger posting", async () => {
    const prisma = createLoanRequestChargePrismaStub([
      {
        amount: 1200,
        chargeValueType: "fixed_amount",
        id: "loan-charge-1",
        kind: "fixed",
        workflowCollectionMode: "pay_separately",
      },
    ])

    await applyApplicableWorkflowCharges(
      {
        actorUserId: "user-1",
        assessedAt: new Date("2025-02-01T00:00:00.000Z"),
        basisAmount: 100000,
        loanRequestId: "loan-request-1",
        memberId: "member-1",
        sourceType: "backfill",
        tenantId: "tenant-1",
        trigger: "submission",
        workflow: "loan_request",
      },
      prisma as never
    )

    expect(prisma.chargeApplicationCreates[0]).toMatchObject({
      data: {
        amount: 1200,
        chargeApplicabilityId: "applicability-loan-charge-1",
        chargeDefinitionId: "loan-charge-1",
        collectionMode: "pay_separately",
        loanRequestId: "loan-request-1",
        status: "pending",
      },
    })
    expect(prisma.chargeApplicationFindFirstCalls).toHaveLength(1)
  })

  test("settles a pending separate-payment charge into cash and charge income", async () => {
    const prisma = createChargeLifecyclePrismaStub({
      collectionMode: "pay_separately",
      status: "pending",
    })

    const result = await settleChargeApplication(
      {
        actorUserId: "finance-user",
        chargeApplicationId: "charge-application-1",
        paidAt: new Date("2026-08-30T00:00:00.000Z"),
        reference: "BANK-CHARGE-001",
        sourceType: "import",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(result.status).toBe("posted")
    expect(prisma.ledgerTransactions[0]).toMatchObject({
      data: {
        chargeApplicationId: "charge-application-1",
        entries: {
          create: [
            {
              amount: 12_000,
              direction: "debit",
              ledgerAccountId: "account-2000",
              tenantId: "tenant-1",
            },
            {
              amount: 12_000,
              direction: "credit",
              ledgerAccountId: "account-3000",
              tenantId: "tenant-1",
            },
          ],
        },
        reference: "BANK-CHARGE-001",
      },
    })
    expect(prisma.memberUpdates).toHaveLength(0)
    expect(prisma.auditLogs[0]).toMatchObject({
      data: { action: "charge.settled" },
    })
  })

  test("waives a pending separate-payment charge without manufacturing a ledger entry", async () => {
    const prisma = createChargeLifecyclePrismaStub({
      collectionMode: "pay_separately",
      status: "pending",
    })

    const result = await waiveChargeApplication(
      {
        actorUserId: "finance-user",
        chargeApplicationId: "charge-application-1",
        reason: "Approved hardship exception.",
        sourceType: "import",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(result.status).toBe("waived")
    expect(prisma.ledgerTransactions).toHaveLength(0)
    expect(prisma.auditLogs[0]).toMatchObject({
      data: {
        action: "charge.waived",
        metadata: {
          correctiveLedgerTransactionId: null,
          priorStatus: "pending",
          reason: "Approved hardship exception.",
        },
      },
    })
  })

  test("reverses a posted separate payment through cash without changing savings", async () => {
    const prisma = createChargeLifecyclePrismaStub({
      collectionMode: "pay_separately",
      status: "posted",
    })

    const result = await reverseChargeApplication(
      {
        actorUserId: "finance-user",
        chargeApplicationId: "charge-application-1",
        reason: "The bank confirmed a duplicated collection.",
        sourceType: "import",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(result.status).toBe("reversed")
    expect(prisma.ledgerTransactions[0]).toMatchObject({
      data: {
        chargeApplicationId: undefined,
        entries: {
          create: [
            { direction: "debit", ledgerAccountId: "account-3000" },
            { direction: "credit", ledgerAccountId: "account-2000" },
          ],
        },
      },
    })
    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("waives a posted savings charge with an opposite ledger entry and savings restoration", async () => {
    const prisma = createChargeLifecyclePrismaStub({
      collectionMode: "deduct_from_savings",
      isMonthlyLevy: true,
      status: "posted",
    })

    await waiveChargeApplication(
      {
        actorUserId: "finance-user",
        chargeApplicationId: "charge-application-1",
        reason: "Committee approved a levy exception.",
        sourceType: "import",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.ledgerTransactions[0]).toMatchObject({
      data: {
        entries: {
          create: [
            { direction: "debit", ledgerAccountId: "account-3100" },
            { direction: "credit", ledgerAccountId: "account-1000" },
          ],
        },
        transactionType: "levy",
      },
    })
    expect(prisma.memberUpdates[0]).toMatchObject({
      data: { totalSavingsSnapshot: { increment: 12_000 } },
    })
  })
})

describe("concurrent charge lifecycle claims", () => {
  for (const pair of [
    [waiveChargeApplication, waiveChargeApplication],
    [reverseChargeApplication, reverseChargeApplication],
    [waiveChargeApplication, reverseChargeApplication],
  ] as const) {
    test(`${pair[0].name} competing with ${pair[1].name} restores savings once`, async () => {
      const prisma = createChargeLifecyclePrismaStub({
        collectionMode: "deduct_from_savings",
        status: "posted",
      })
      const input = {
        actorUserId: "finance-user",
        chargeApplicationId: "charge-application-1",
        sourceType: "import" as const,
        tenantId: "tenant-1",
      }
      const results = await Promise.allSettled(
        pair.map((correct) => correct(input, prisma as never))
      )
      expect(
        results.filter((result) => result.status === "fulfilled")
      ).toHaveLength(1)
      expect(
        results.filter((result) => result.status === "rejected")
      ).toHaveLength(1)
      expect(prisma.ledgerTransactions).toHaveLength(1)
      expect(prisma.memberUpdates).toHaveLength(1)
      expect(prisma.auditLogs).toHaveLength(1)
    })
  }
})

test("settlement competing with pending waiver posts at most one lifecycle result", async () => {
  const prisma = createChargeLifecyclePrismaStub({
    collectionMode: "pay_separately",
    status: "pending",
  })
  const input = {
    actorUserId: "finance-user",
    chargeApplicationId: "charge-application-1",
    sourceType: "import" as const,
    tenantId: "tenant-1",
  }
  const results = await Promise.allSettled([
    settleChargeApplication(
      { ...input, paidAt: new Date(), reference: "BANK-CONCURRENT" },
      prisma as never
    ),
    waiveChargeApplication(input, prisma as never),
  ])
  expect(
    results.filter((result) => result.status === "fulfilled")
  ).toHaveLength(1)
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(
    1
  )
  expect(prisma.auditLogs).toHaveLength(1)
  expect(prisma.memberUpdates).toHaveLength(0)
  const winner = results.find((result) => result.status === "fulfilled")!
  expect(prisma.ledgerTransactions).toHaveLength(
    winner.status === "fulfilled" && winner.value.status === "posted" ? 1 : 0
  )
})
