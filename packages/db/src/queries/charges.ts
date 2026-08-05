import type { ChargeKind, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import { postLedgerTransaction, getLedgerAccountByCode } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"
import { createMemberShareLedgerEntry } from "./tenant-finance"

export const chargeWorkflowKeys = [
  "commitment_collection",
  "loan_request",
  "loan",
  "procurement_request",
  "food_purchase_application",
  "project_financing_request",
] as const

export type ChargeWorkflow = (typeof chargeWorkflowKeys)[number]

export const chargeApplicabilityTriggerKeys = [
  "monthly_collection",
  "submission",
  "approval",
  "manual",
] as const

export type ChargeApplicabilityTrigger =
  (typeof chargeApplicabilityTriggerKeys)[number]

export const chargeCollectionModeKeys = [
  "deduct_from_savings",
  "pay_separately",
] as const

export type ChargeCollectionMode = (typeof chargeCollectionModeKeys)[number]

export type ChargeApplicabilityInput = {
  collectionMode?: ChargeCollectionMode
  isActive?: boolean
  isRequired?: boolean
  trigger: ChargeApplicabilityTrigger
  workflow: ChargeWorkflow
}

export type ChargeQuote = {
  amount: number
  basisAmount: number
  chargeApplicabilityId: string | null
  chargeDefinitionId: string
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: ChargeCollectionMode
  effectiveAmount: number
  isRequired: boolean
  name: string
  purpose: string
  trigger: ChargeApplicabilityTrigger
  workflow: ChargeWorkflow
}

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

async function getChargeDefinitionMutationMode(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return "live_operations" as const
  }

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw ExpectedQueryError.precondition(
      "Charge definition writes are locked until initial migration is finalized."
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw ExpectedQueryError.precondition(
      "Historical charge setup is locked because member ledger backfill has already started."
    )
  }

  return "historical_setup" as const
}

function assertLiveChargeEffectiveDateNotBackdated(effectiveFrom: Date) {
  if (effectiveFrom.getTime() < startOfUtcDay(new Date()).getTime()) {
    throw ExpectedQueryError.precondition(
      "Live charge definition updates cannot be backdated. Use correction workflows for past periods."
    )
  }
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
}

function uniqueApplicabilityRows(rows: ChargeApplicabilityInput[]) {
  const byKey = new Map<string, Required<ChargeApplicabilityInput>>()

  for (const row of rows) {
    byKey.set(`${row.workflow}:${row.trigger}`, {
      collectionMode: row.collectionMode ?? "deduct_from_savings",
      isActive: row.isActive ?? true,
      isRequired: row.isRequired ?? true,
      trigger: row.trigger,
      workflow: row.workflow,
    })
  }

  return [...byKey.values()]
}

function legacyApplicabilityForDefinition(input: {
  appliesToLoanRequests?: boolean | null
  appliesToLoans?: boolean | null
  appliesToMembers?: boolean | null
  isActive?: boolean | null
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
    | null
}) {
  const rows: ChargeApplicabilityInput[] = []
  const isActive = input.isActive ?? true

  if (input.appliesToMembers ?? false) {
    rows.push({
      isActive,
      trigger: "monthly_collection",
      workflow: "commitment_collection",
    })
  }

  if (input.appliesToLoanRequests || input.purpose === "loan_fee") {
    rows.push({
      isActive,
      trigger: "submission",
      workflow: "loan_request",
    })
  }

  if (input.appliesToLoans) {
    rows.push({
      isActive,
      trigger: "manual",
      workflow: "loan",
    })
  }

  return uniqueApplicabilityRows(rows)
}

async function replaceChargeApplicability(input: {
  chargeDefinitionId: string
  rows: ChargeApplicabilityInput[]
  tenantId: string
  tx: PrismaClient
}) {
  const txAny = input.tx as any

  if (typeof txAny.chargeApplicability?.deleteMany !== "function") {
    return
  }

  await txAny.chargeApplicability.deleteMany({
    where: {
      chargeDefinitionId: input.chargeDefinitionId,
      tenantId: input.tenantId,
    },
  })

  const rows = uniqueApplicabilityRows(input.rows)

  if (rows.length === 0) {
    return
  }

  await txAny.chargeApplicability.createMany({
    data: rows.map((row) => ({
      chargeDefinitionId: input.chargeDefinitionId,
      collectionMode: row.collectionMode,
      isActive: row.isActive,
      isRequired: row.isRequired,
      tenantId: input.tenantId,
      trigger: row.trigger,
      workflow: row.workflow,
    })),
  })
}

function calculateChargeQuoteAmount(input: {
  basisAmount: number
  chargeValueType: "fixed_amount" | "percentage"
  versionAmount: number
}) {
  if (input.chargeValueType === "percentage") {
    return Number(((input.basisAmount * input.versionAmount) / 100).toFixed(2))
  }

  return Number(input.versionAmount.toFixed(2))
}

function toChargeQuote(input: {
  applicabilityId?: string | null
  basisAmount: number
  collectionMode?: ChargeCollectionMode | null
  definition: any
  isRequired?: boolean | null
  trigger: ChargeApplicabilityTrigger
  workflow: ChargeWorkflow
}): ChargeQuote | null {
  const version = input.definition.versions?.[0]
  if (!version) return null

  const chargeValueType =
    version.chargeValueType ??
    (version.kind === "percentage" ? "percentage" : "fixed_amount")
  const effectiveAmount = Number(version.amount)
  const amount = calculateChargeQuoteAmount({
    basisAmount: input.basisAmount,
    chargeValueType,
    versionAmount: effectiveAmount,
  })

  if (amount <= 0) return null

  return {
    amount,
    basisAmount: input.basisAmount,
    chargeApplicabilityId: input.applicabilityId ?? null,
    chargeDefinitionId: input.definition.id,
    chargeValueType,
    code: input.definition.code,
    collectionMode: input.collectionMode ?? "deduct_from_savings",
    effectiveAmount,
    isRequired: input.isRequired ?? true,
    name: input.definition.name,
    purpose: input.definition.purpose ?? "general",
    trigger: input.trigger,
    workflow: input.workflow,
  }
}

function legacyChargeWhereForWorkflow(input: {
  trigger: ChargeApplicabilityTrigger
  workflow: ChargeWorkflow
}): any {
  if (
    input.workflow === "commitment_collection" &&
    input.trigger === "monthly_collection"
  ) {
    return { appliesToMembers: true }
  }

  if (input.workflow === "loan_request" && input.trigger === "submission") {
    return {
      OR: [{ purpose: "loan_fee" }, { appliesToLoanRequests: true }],
    }
  }

  if (input.workflow === "loan" && input.trigger === "manual") {
    return { appliesToLoans: true }
  }

  return null
}

async function quoteApplicableChargesInTransaction(
  input: {
    assessedAt: Date
    basisAmount: number
    tenantId: string
    trigger: ChargeApplicabilityTrigger
    workflow: ChargeWorkflow
  },
  tx: PrismaClient
): Promise<ChargeQuote[]> {
  const txAny = tx as any

  if (typeof txAny.chargeApplicability?.findMany === "function") {
    const applicabilityRows = await txAny.chargeApplicability.findMany({
      include: {
        chargeDefinition: {
          include: {
            versions: {
              orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
              take: 1,
              where: {
                effectiveFrom: {
                  lte: input.assessedAt,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      where: {
        isActive: true,
        tenantId: input.tenantId,
        trigger: input.trigger,
        workflow: input.workflow,
        chargeDefinition: {
          isActive: true,
        },
      },
    })

    if (applicabilityRows.length > 0) {
      return applicabilityRows
        .map((row: any) =>
          toChargeQuote({
            applicabilityId: row.id,
            basisAmount: input.basisAmount,
            collectionMode: row.collectionMode,
            definition: row.chargeDefinition,
            isRequired: row.isRequired,
            trigger: input.trigger,
            workflow: input.workflow,
          })
        )
        .filter((quote: ChargeQuote | null): quote is ChargeQuote =>
          Boolean(quote)
        )
    }
  }

  const legacyWhere = legacyChargeWhereForWorkflow(input)
  if (!legacyWhere) return []

  const definitions = await tx.chargeDefinition.findMany({
    include: {
      versions: {
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
        take: 1,
        where: {
          effectiveFrom: {
            lte: input.assessedAt,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    where: {
      isActive: true,
      tenantId: input.tenantId,
      ...legacyWhere,
    },
  })

  return definitions
    .map((definition) =>
      toChargeQuote({
        basisAmount: input.basisAmount,
        definition,
        trigger: input.trigger,
        workflow: input.workflow,
      })
    )
    .filter((quote): quote is ChargeQuote => Boolean(quote))
}

export async function listChargeDefinitions(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return (prisma as any).chargeDefinition.findMany({
    where: { tenantId },
    include: {
      applicability: {
        orderBy: [{ workflow: "asc" }, { trigger: "asc" }],
      },
      versions: {
        orderBy: { effectiveFrom: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function listChargeApplications(
  tenantId: string,
  input?: {
    fromDate?: Date
    limit?: number
    memberId?: string
    search?: string
    status?: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return (prisma as any).chargeApplication.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.status ? { status: input.status as never } : {}),
      ...(input?.fromDate || input?.toDate
        ? {
            assessedAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.search
        ? {
            OR: [
              { notes: { contains: input.search, mode: "insensitive" } },
              {
                member: {
                  fullName: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                member: {
                  memberNumber: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                chargeDefinition: {
                  name: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      chargeApplicability: true,
      chargeDefinition: true,
      foodPurchaseApplication: {
        select: {
          id: true,
          requestedAt: true,
          status: true,
        },
      },
      loanRequest: {
        select: {
          id: true,
          requestedAt: true,
          status: true,
        },
      },
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
        },
      },
      procurementRequest: {
        select: {
          id: true,
          itemName: true,
          requestedAt: true,
          status: true,
        },
      },
      projectFinancingRequest: {
        select: {
          businessName: true,
          id: true,
          requestedAt: true,
          status: true,
        },
      },
    },
    orderBy: { assessedAt: "desc" },
    take: input?.limit ?? 100,
  })
}

export type CreateChargeDefinitionInput = {
  tenantId: string
  name: string
  code?: string
  kind: ChargeKind
  chargeFrequency?:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType?: "fixed_amount" | "percentage"
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
  amount: number
  effectiveFrom: Date
  isMonthlyLevy?: boolean
  appliesToMembers?: boolean
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  applicability?: ChargeApplicabilityInput[]
}

function normalizeChargeDefinitionInput<
  TInput extends {
    appliesToLoanRequests?: boolean
    appliesToLoans?: boolean
    appliesToMembers?: boolean
    chargeFrequency?:
      | "recurring_monthly"
      | "per_contribution"
      | "one_time"
      | "manual"
    purpose?:
      | "general"
      | "member_share"
      | "loan_fee"
      | "membership_fee"
      | "penalty"
  },
>(input: TInput) {
  if (input.purpose !== "loan_fee") {
    return input
  }

  return {
    ...input,
    appliesToLoanRequests: true,
    appliesToLoans: input.appliesToLoans ?? false,
    appliesToMembers: false,
    chargeFrequency: input.chargeFrequency ?? "one_time",
  }
}

export async function createChargeDefinition(
  input: CreateChargeDefinitionInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const normalizedInput = normalizeChargeDefinitionInput(input)
  const internalCode =
    normalizedInput.code?.trim() ||
    `charge-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`
  const mutationMode = await getChargeDefinitionMutationMode(
    normalizedInput.tenantId,
    prisma
  )

  if (mutationMode === "live_operations") {
    assertLiveChargeEffectiveDateNotBackdated(normalizedInput.effectiveFrom)
  }

  return prisma.$transaction(async (tx) => {
    const definition = await tx.chargeDefinition.create({
      data: {
        tenantId: normalizedInput.tenantId,
        name: normalizedInput.name,
        code: internalCode,
        kind: normalizedInput.kind,
        chargeFrequency: normalizedInput.chargeFrequency ?? "recurring_monthly",
        chargeValueType:
          normalizedInput.chargeValueType ??
          (normalizedInput.kind === "percentage"
            ? "percentage"
            : "fixed_amount"),
        purpose: normalizedInput.purpose ?? "general",
        amount: normalizedInput.amount,
        isMonthlyLevy: normalizedInput.isMonthlyLevy ?? false,
        appliesToMembers: normalizedInput.appliesToMembers ?? true,
        appliesToLoanRequests: normalizedInput.appliesToLoanRequests ?? false,
        appliesToLoans: normalizedInput.appliesToLoans ?? false,
        isActive: true,
      },
    })

    await replaceChargeApplicability({
      chargeDefinitionId: definition.id,
      rows:
        normalizedInput.applicability ??
        legacyApplicabilityForDefinition({
          appliesToLoanRequests: normalizedInput.appliesToLoanRequests ?? false,
          appliesToLoans: normalizedInput.appliesToLoans ?? false,
          appliesToMembers: normalizedInput.appliesToMembers ?? true,
          isActive: true,
          purpose: normalizedInput.purpose ?? "general",
        }),
      tenantId: normalizedInput.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await tx.chargeDefinitionVersion.create({
      data: {
        tenantId: normalizedInput.tenantId,
        chargeDefinitionId: definition.id,
        effectiveFrom: normalizedInput.effectiveFrom,
        amount: normalizedInput.amount,
        kind: normalizedInput.kind,
        chargeValueType:
          normalizedInput.chargeValueType ??
          (normalizedInput.kind === "percentage"
            ? "percentage"
            : "fixed_amount"),
      },
    })

    return tx.chargeDefinition.findFirst({
      where: { id: definition.id, tenantId: normalizedInput.tenantId },
      include: {
        versions: {
          orderBy: { effectiveFrom: "desc" },
        },
      },
    })
  })
}

export async function deleteChargeDefinition(
  tenantId: string,
  chargeDefinitionId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await getChargeDefinitionMutationMode(tenantId, prisma)

  const applicationCount = await prisma.chargeApplication.count({
    where: { chargeDefinitionId, tenantId },
  })

  if (applicationCount > 0) {
    throw ExpectedQueryError.conflict(
      "This charge has member records and cannot be deleted. Deactivate it instead."
    )
  }

  return prisma.chargeDefinition.delete({
    where: { id: chargeDefinitionId, tenantId },
  })
}

export async function deleteChargeDefinitionVersion(
  tenantId: string,
  chargeDefinitionVersionId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await getChargeDefinitionMutationMode(tenantId, prisma)

  const version = await prisma.chargeDefinitionVersion.findFirst({
    where: { id: chargeDefinitionVersionId, tenantId },
  })

  if (!version) {
    throw ExpectedQueryError.notFound("Charge history row not found.")
  }

  const versionCount = await prisma.chargeDefinitionVersion.count({
    where: { chargeDefinitionId: version.chargeDefinitionId, tenantId },
  })

  if (versionCount <= 1) {
    throw ExpectedQueryError.precondition(
      "A charge must keep at least one dated amount."
    )
  }

  return prisma.chargeDefinitionVersion.delete({
    where: { id: chargeDefinitionVersionId, tenantId },
  })
}

export type UpdateChargeDefinitionInput = {
  name?: string
  code?: string
  kind?: ChargeKind
  chargeFrequency?:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType?: "fixed_amount" | "percentage"
  amount?: number
  effectiveFrom?: Date
  notes?: string
  createdByUserId?: string
  isActive?: boolean
  isMonthlyLevy?: boolean
  appliesToMembers?: boolean
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
  applicability?: ChargeApplicabilityInput[]
}

export async function updateChargeDefinition(
  tenantId: string,
  chargeDefinitionId: string,
  input: UpdateChargeDefinitionInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const mutationMode = await getChargeDefinitionMutationMode(tenantId, prisma)
  const normalizedInput = normalizeChargeDefinitionInput(input)

  const {
    amount,
    createdByUserId,
    effectiveFrom,
    kind,
    chargeValueType,
    notes,
    applicability,
    ...definitionUpdates
  } = normalizedInput

  return prisma.$transaction(async (tx) => {
    const currentDefinition = await tx.chargeDefinition.findFirst({
      where: { id: chargeDefinitionId, tenantId },
    })

    if (!currentDefinition) {
      throw ExpectedQueryError.notFound("Charge definition not found")
    }

    const definition =
      Object.keys(definitionUpdates).length > 0
        ? await tx.chargeDefinition.update({
            where: { id: chargeDefinitionId, tenantId },
            data: definitionUpdates,
          })
        : currentDefinition

    if (applicability) {
      await replaceChargeApplicability({
        chargeDefinitionId,
        rows: applicability,
        tenantId,
        tx: tx as unknown as PrismaClient,
      })
    } else if (
      "appliesToLoanRequests" in definitionUpdates ||
      "appliesToLoans" in definitionUpdates ||
      "appliesToMembers" in definitionUpdates ||
      "purpose" in definitionUpdates
    ) {
      await replaceChargeApplicability({
        chargeDefinitionId,
        rows: legacyApplicabilityForDefinition({
          appliesToLoanRequests:
            definition.appliesToLoanRequests ??
            currentDefinition.appliesToLoanRequests,
          appliesToLoans:
            definition.appliesToLoans ?? currentDefinition.appliesToLoans,
          appliesToMembers:
            definition.appliesToMembers ?? currentDefinition.appliesToMembers,
          isActive: definition.isActive ?? currentDefinition.isActive,
          purpose: (definition.purpose ?? currentDefinition.purpose) as never,
        }),
        tenantId,
        tx: tx as unknown as PrismaClient,
      })
    } else if (definitionUpdates.isActive !== undefined) {
      const txAny = tx as any
      if (typeof txAny.chargeApplicability?.updateMany === "function") {
        await txAny.chargeApplicability.updateMany({
          data: {
            isActive: definitionUpdates.isActive,
          },
          where: {
            chargeDefinitionId,
            tenantId,
          },
        })
      }
    }

    if (
      amount === undefined &&
      kind === undefined &&
      chargeValueType === undefined
    ) {
      return definition
    }

    const versionEffectiveFrom = effectiveFrom ?? new Date()

    if (mutationMode === "live_operations") {
      assertLiveChargeEffectiveDateNotBackdated(versionEffectiveFrom)
    }

    await tx.chargeDefinitionVersion.create({
      data: {
        tenantId,
        chargeDefinitionId,
        effectiveFrom: versionEffectiveFrom,
        amount: amount ?? currentDefinition.amount,
        kind: kind ?? currentDefinition.kind,
        chargeValueType:
          chargeValueType ??
          ((kind ?? currentDefinition.kind) === "percentage"
            ? "percentage"
            : "fixed_amount"),
        notes,
        createdByUserId,
      },
    })

    const latestEffectiveVersion = await tx.chargeDefinitionVersion.findFirst({
      where: {
        tenantId,
        chargeDefinitionId,
        effectiveFrom: {
          lte: new Date(),
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    })

    if (!latestEffectiveVersion) {
      return definition
    }

    return tx.chargeDefinition.update({
      where: { id: chargeDefinitionId, tenantId },
      data: {
        amount: latestEffectiveVersion.amount,
        kind: latestEffectiveVersion.kind,
        chargeValueType: latestEffectiveVersion.chargeValueType,
      },
    })
  })
}

export type ApplyChargeInput = {
  tenantId: string
  memberId: string
  chargeDefinitionId: string
  chargeApplicabilityId?: string | null
  amount: number
  assessedAt: Date
  collectionMode?: ChargeCollectionMode
  contributionId?: string
  foodPurchaseApplicationId?: string
  loanRequestId?: string
  loanId?: string
  procurementRequestId?: string
  projectFinancingRequestId?: string
  notes?: string
  actorUserId: string
  sourceType?: "backfill" | "import"
}

async function applyChargeInTransaction(
  input: ApplyChargeInput,
  tx: PrismaClient
) {
  const txAny = tx as any
  const chargeDef = await tx.chargeDefinition.findFirst({
    where: { id: input.chargeDefinitionId, tenantId: input.tenantId },
  })
  if (!chargeDef)
    throw ExpectedQueryError.notFound("Charge definition not found")

  const collectionMode = input.collectionMode ?? "deduct_from_savings"
  const shouldPostToSavings = collectionMode === "deduct_from_savings"
  const isShareCharge = (chargeDef as any).purpose === "member_share"
  const ledgerAccountCode = isShareCharge
    ? "3200"
    : chargeDef.isMonthlyLevy
      ? "3100"
      : "3000"
  const savingsAccount = shouldPostToSavings
    ? await getLedgerAccountByCode(input.tenantId, "1000", tx)
    : null
  const incomeAccount = shouldPostToSavings
    ? await getLedgerAccountByCode(input.tenantId, ledgerAccountCode, tx)
    : null

  if (shouldPostToSavings && (!savingsAccount || !incomeAccount)) {
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
  }

  const application = await txAny.chargeApplication.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      chargeDefinitionId: input.chargeDefinitionId,
      chargeApplicabilityId: input.chargeApplicabilityId ?? undefined,
      amount: input.amount,
      assessedAt: input.assessedAt,
      collectionMode,
      status: shouldPostToSavings ? "posted" : "pending",
      contributionId: input.contributionId,
      foodPurchaseApplicationId: input.foodPurchaseApplicationId,
      loanRequestId: input.loanRequestId,
      loanId: input.loanId,
      procurementRequestId: input.procurementRequestId,
      projectFinancingRequestId: input.projectFinancingRequestId,
      notes: input.notes,
    },
  })

  if (!shouldPostToSavings) {
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.staged",
        entityType: "ChargeApplication",
        entityId: application.id,
        metadata: {
          amount: input.amount,
          chargeDefinitionId: input.chargeDefinitionId,
          collectionMode,
          foodPurchaseApplicationId: input.foodPurchaseApplicationId ?? null,
          loanId: input.loanId ?? null,
          loanRequestId: input.loanRequestId ?? null,
          memberId: input.memberId,
          procurementRequestId: input.procurementRequestId ?? null,
          projectFinancingRequestId: input.projectFinancingRequestId ?? null,
          sourceType: input.sourceType ?? "live",
        },
        occurredAt: new Date(),
      },
    })

    return application
  }

  // Post ledger: debit Member Savings, credit Charge/Levy Income or Member Share Capital.
  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: chargeDef.isMonthlyLevy ? "levy" : "charge",
      postedAt: input.assessedAt,
      memberId: input.memberId,
      chargeApplicationId: application.id,
      narration: `${chargeDef.name} assessed`,
      sourceType: input.sourceType,
      entries: [
        {
          ledgerAccountId: savingsAccount!.id,
          direction: "debit",
          amount: input.amount,
        },
        {
          ledgerAccountId: incomeAccount!.id,
          direction: "credit",
          amount: input.amount,
        },
      ],
    },
    tx as unknown as PrismaClient
  )

  if (isShareCharge) {
    await createMemberShareLedgerEntry(
      {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: input.amount,
        effectiveDate: input.assessedAt,
        sourceType: "monthly_share_charge",
        sourceId: application.id,
        notes:
          input.notes ?? `${chargeDef.name} posted to member share balance`,
        createdByUserId: input.actorUserId,
      },
      tx as unknown as PrismaClient
    )
  }

  await tx.member.update({
    where: { id: input.memberId, tenantId: input.tenantId },
    data: {
      totalSavingsSnapshot: {
        decrement: input.amount,
      },
    },
  })

  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "charge.applied",
      entityType: "ChargeApplication",
      entityId: application.id,
      metadata: {
        memberId: input.memberId,
        chargeDefinitionId: input.chargeDefinitionId,
        amount: input.amount,
        collectionMode,
        foodPurchaseApplicationId: input.foodPurchaseApplicationId ?? null,
        loanRequestId: input.loanRequestId ?? null,
        loanId: input.loanId ?? null,
        procurementRequestId: input.procurementRequestId ?? null,
        projectFinancingRequestId: input.projectFinancingRequestId ?? null,
        sourceType: input.sourceType ?? "live",
      },
      occurredAt: new Date(),
    },
  })

  return application
}

export async function applyCharge(
  input: ApplyChargeInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  return prisma.$transaction((tx) =>
    applyChargeInTransaction(input, tx as unknown as PrismaClient)
  )
}

export async function quoteApplicableCharges(
  input: {
    assessedAt?: Date
    basisAmount: number
    tenantId: string
    trigger: ChargeApplicabilityTrigger
    workflow: ChargeWorkflow
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return quoteApplicableChargesInTransaction(
    {
      assessedAt: input.assessedAt ?? new Date(),
      basisAmount: input.basisAmount,
      tenantId: input.tenantId,
      trigger: input.trigger,
      workflow: input.workflow,
    },
    prisma
  )
}

function targetWhereForChargeApplication(input: {
  foodPurchaseApplicationId?: string
  loanId?: string
  loanRequestId?: string
  procurementRequestId?: string
  projectFinancingRequestId?: string
}) {
  if (input.loanRequestId) return { loanRequestId: input.loanRequestId }
  if (input.loanId) return { loanId: input.loanId }
  if (input.procurementRequestId) {
    return { procurementRequestId: input.procurementRequestId }
  }
  if (input.foodPurchaseApplicationId) {
    return { foodPurchaseApplicationId: input.foodPurchaseApplicationId }
  }
  if (input.projectFinancingRequestId) {
    return { projectFinancingRequestId: input.projectFinancingRequestId }
  }

  return null
}

export async function applyApplicableWorkflowChargesInTransaction(
  input: {
    actorUserId: string
    assessedAt: Date
    basisAmount: number
    foodPurchaseApplicationId?: string
    loanId?: string
    loanRequestId?: string
    memberId: string
    notes?: string
    procurementRequestId?: string
    projectFinancingRequestId?: string
    sourceType?: "backfill" | "import"
    tenantId: string
    trigger: ChargeApplicabilityTrigger
    workflow: ChargeWorkflow
  },
  tx: PrismaClient
) {
  const quotes = await quoteApplicableChargesInTransaction(
    {
      assessedAt: input.assessedAt,
      basisAmount: input.basisAmount,
      tenantId: input.tenantId,
      trigger: input.trigger,
      workflow: input.workflow,
    },
    tx
  )
  const applications = []
  const targetWhere = targetWhereForChargeApplication(input)

  for (const quote of quotes) {
    if (targetWhere) {
      const existingApplication = await (tx as any).chargeApplication.findFirst(
        {
          where: {
            ...targetWhere,
            chargeDefinitionId: quote.chargeDefinitionId,
            tenantId: input.tenantId,
          },
        }
      )

      if (existingApplication) {
        applications.push(existingApplication)
        continue
      }
    }

    applications.push(
      await applyChargeInTransaction(
        {
          actorUserId: input.actorUserId,
          amount: quote.amount,
          assessedAt: input.assessedAt,
          chargeApplicabilityId: quote.chargeApplicabilityId,
          chargeDefinitionId: quote.chargeDefinitionId,
          collectionMode: quote.collectionMode,
          foodPurchaseApplicationId: input.foodPurchaseApplicationId,
          loanId: input.loanId,
          loanRequestId: input.loanRequestId,
          memberId: input.memberId,
          notes:
            input.notes ??
            `Automatically ${quote.collectionMode === "pay_separately" ? "staged" : "posted"} for ${quote.workflow.replace(/_/g, " ")}.`,
          procurementRequestId: input.procurementRequestId,
          projectFinancingRequestId: input.projectFinancingRequestId,
          sourceType: input.sourceType,
          tenantId: input.tenantId,
        },
        tx
      )
    )
  }

  return applications
}

export async function applyApplicableWorkflowCharges(
  input: Parameters<typeof applyApplicableWorkflowChargesInTransaction>[0],
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  return prisma.$transaction((tx) =>
    applyApplicableWorkflowChargesInTransaction(
      input,
      tx as unknown as PrismaClient
    )
  )
}

export type ApplyLoanRequestChargesInput = {
  actorUserId: string
  assessedAt: Date
  loanRequestId: string
  memberId: string
  requestedAmount: number
  sourceType?: "backfill" | "import"
  tenantId: string
}

export async function applyLoanRequestChargesInTransaction(
  input: ApplyLoanRequestChargesInput,
  tx: PrismaClient
) {
  return applyApplicableWorkflowChargesInTransaction(
    {
      actorUserId: input.actorUserId,
      assessedAt: input.assessedAt,
      basisAmount: input.requestedAmount,
      loanRequestId: input.loanRequestId,
      memberId: input.memberId,
      notes: "Automatically posted for loan application.",
      sourceType: input.sourceType,
      tenantId: input.tenantId,
      trigger: "submission",
      workflow: "loan_request",
    },
    tx
  )
}

export async function applyLoanRequestCharges(
  input: ApplyLoanRequestChargesInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  return prisma.$transaction((tx) =>
    applyLoanRequestChargesInTransaction(input, tx as unknown as PrismaClient)
  )
}

async function restoreChargeToMemberSavings(input: {
  isMonthlyLevy: boolean
  isShareCharge?: boolean
  amount: number
  applicationId: string
  applicationName: string
  assessedAt: Date
  memberId: string
  tenantId: string
  tx: PrismaClient
}) {
  const savingsAccount = await getLedgerAccountByCode(
    input.tenantId,
    "1000",
    input.tx
  )
  const incomeAccount = await getLedgerAccountByCode(
    input.tenantId,
    input.isShareCharge ? "3200" : input.isMonthlyLevy ? "3100" : "3000",
    input.tx
  )

  if (!savingsAccount || !incomeAccount) {
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
  }

  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: "charge",
      postedAt: input.assessedAt,
      memberId: input.memberId,
      chargeApplicationId: input.applicationId,
      narration: `${input.applicationName} restored`,
      entries: [
        {
          ledgerAccountId: incomeAccount.id,
          direction: "debit",
          amount: input.amount,
        },
        {
          ledgerAccountId: savingsAccount.id,
          direction: "credit",
          amount: input.amount,
        },
      ],
    },
    input.tx
  )

  await input.tx.member.update({
    where: { id: input.memberId, tenantId: input.tenantId },
    data: {
      totalSavingsSnapshot: {
        increment: input.amount,
      },
    },
  })

  if (input.isShareCharge) {
    await createMemberShareLedgerEntry(
      {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: -input.amount,
        effectiveDate: input.assessedAt,
        sourceType: "reversal",
        sourceId: input.applicationId,
        notes: `${input.applicationName} restored from member share balance`,
      },
      input.tx
    )
  }
}

export async function waiveChargeApplication(
  input: {
    actorUserId: string
    chargeApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application)
      throw ExpectedQueryError.notFound("Charge application not found")
    if (application.status !== "posted")
      throw ExpectedQueryError.conflict(
        "Only posted charge applications can be waived."
      )

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "waived",
        waivedAt: new Date(),
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      isShareCharge:
        (application.chargeDefinition as any).purpose === "member_share",
      amount: Number(application.amount),
      applicationId: application.id,
      applicationName: application.chargeDefinition.name,
      assessedAt: new Date(),
      memberId: application.memberId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.waived",
        entityType: "ChargeApplication",
        entityId: updated.id,
        metadata: {
          amount: Number(updated.amount),
        },
        occurredAt: new Date(),
      },
    })

    return updated
  })
}

export async function reverseChargeApplication(
  input: {
    actorUserId: string
    chargeApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application)
      throw ExpectedQueryError.notFound("Charge application not found")
    if (application.status !== "posted")
      throw ExpectedQueryError.conflict(
        "Only posted charge applications can be reversed."
      )

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "reversed",
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      isShareCharge:
        (application.chargeDefinition as any).purpose === "member_share",
      amount: Number(application.amount),
      applicationId: application.id,
      applicationName: application.chargeDefinition.name,
      assessedAt: new Date(),
      memberId: application.memberId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.reversed",
        entityType: "ChargeApplication",
        entityId: updated.id,
        metadata: {
          amount: Number(updated.amount),
        },
        occurredAt: new Date(),
      },
    })

    return updated
  })
}
