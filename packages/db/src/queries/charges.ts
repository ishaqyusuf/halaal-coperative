import type { ChargeKind, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { postLedgerTransaction, getLedgerAccountByCode } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"
import { createMemberShareLedgerEntry } from "./tenant-finance"

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  )
}

async function getChargeDefinitionMutationMode(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return "live_operations" as const
  }

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Charge definition writes are locked until initial migration is finalized.",
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Historical charge setup is locked because member ledger backfill has already started.",
    )
  }

  return "historical_setup" as const
}

function assertLiveChargeEffectiveDateNotBackdated(effectiveFrom: Date) {
  if (effectiveFrom.getTime() < startOfUtcDay(new Date()).getTime()) {
    throw new Error(
      "Live charge definition updates cannot be backdated. Use correction workflows for past periods.",
    )
  }
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized.",
    )
  }
}

export async function listChargeDefinitions(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeDefinition.findMany({
    where: { tenantId },
    include: {
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
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeApplication.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.status ? { status: input.status as never } : {}),
      ...((input?.fromDate || input?.toDate)
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
      chargeDefinition: true,
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
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
  code: string
  kind: ChargeKind
  chargeFrequency?: "recurring_monthly" | "per_contribution" | "one_time" | "manual"
  chargeValueType?: "fixed_amount" | "percentage"
  purpose?: "general" | "member_share" | "loan_fee" | "membership_fee" | "penalty"
  amount: number
  effectiveFrom: Date
  isMonthlyLevy?: boolean
  appliesToMembers?: boolean
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
}

export async function createChargeDefinition(
  input: CreateChargeDefinitionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const mutationMode = await getChargeDefinitionMutationMode(
    input.tenantId,
    prisma,
  )

  if (mutationMode === "live_operations") {
    assertLiveChargeEffectiveDateNotBackdated(input.effectiveFrom)
  }

  return prisma.$transaction(async (tx) => {
    const definition = await tx.chargeDefinition.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        code: input.code,
        kind: input.kind,
        chargeFrequency: input.chargeFrequency ?? "recurring_monthly",
        chargeValueType:
          input.chargeValueType ?? (input.kind === "percentage" ? "percentage" : "fixed_amount"),
        purpose: input.purpose ?? "general",
        amount: input.amount,
        isMonthlyLevy: input.isMonthlyLevy ?? false,
        appliesToMembers: input.appliesToMembers ?? true,
        appliesToLoanRequests: input.appliesToLoanRequests ?? false,
        appliesToLoans: input.appliesToLoans ?? false,
        isActive: true,
      },
    })

    await tx.chargeDefinitionVersion.create({
      data: {
        tenantId: input.tenantId,
        chargeDefinitionId: definition.id,
        effectiveFrom: input.effectiveFrom,
        amount: input.amount,
        kind: input.kind,
        chargeValueType:
          input.chargeValueType ?? (input.kind === "percentage" ? "percentage" : "fixed_amount"),
      },
    })

    return tx.chargeDefinition.findFirst({
      where: { id: definition.id, tenantId: input.tenantId },
      include: {
        versions: {
          orderBy: { effectiveFrom: "desc" },
        },
      },
    })
  })
}

export type UpdateChargeDefinitionInput = {
  name?: string
  code?: string
  kind?: ChargeKind
  chargeFrequency?: "recurring_monthly" | "per_contribution" | "one_time" | "manual"
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
  purpose?: "general" | "member_share" | "loan_fee" | "membership_fee" | "penalty"
}

export async function updateChargeDefinition(
  tenantId: string,
  chargeDefinitionId: string,
  input: UpdateChargeDefinitionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const mutationMode = await getChargeDefinitionMutationMode(tenantId, prisma)

  const {
    amount,
    createdByUserId,
    effectiveFrom,
    kind,
    chargeValueType,
    notes,
    ...definitionUpdates
  } = input

  return prisma.$transaction(async (tx) => {
    const currentDefinition = await tx.chargeDefinition.findFirst({
      where: { id: chargeDefinitionId, tenantId },
    })

    if (!currentDefinition) {
      throw new Error("Charge definition not found")
    }

    const definition =
      Object.keys(definitionUpdates).length > 0
        ? await tx.chargeDefinition.update({
            where: { id: chargeDefinitionId, tenantId },
            data: definitionUpdates,
          })
        : currentDefinition

    if (amount === undefined && kind === undefined && chargeValueType === undefined) {
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
          ((kind ?? currentDefinition.kind) === "percentage" ? "percentage" : "fixed_amount"),
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
  amount: number
  assessedAt: Date
  contributionId?: string
  loanRequestId?: string
  loanId?: string
  notes?: string
  actorUserId: string
  sourceType?: "backfill" | "import"
}

export async function applyCharge(
  input: ApplyChargeInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  const chargeDef = await prisma.chargeDefinition.findFirst({
    where: { id: input.chargeDefinitionId, tenantId: input.tenantId },
  })
  if (!chargeDef) throw new Error("Charge definition not found")

  const isShareCharge = (chargeDef as any).purpose === "member_share"
  const ledgerAccountCode = isShareCharge ? "3200" : chargeDef.isMonthlyLevy ? "3100" : "3000"
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", prisma)
  const incomeAccount = await getLedgerAccountByCode(input.tenantId, ledgerAccountCode, prisma)

  if (!savingsAccount || !incomeAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        chargeDefinitionId: input.chargeDefinitionId,
        amount: input.amount,
        assessedAt: input.assessedAt,
        status: "posted",
        contributionId: input.contributionId,
        loanRequestId: input.loanRequestId,
        loanId: input.loanId,
        notes: input.notes,
      },
    })

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
          { ledgerAccountId: savingsAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: incomeAccount.id, direction: "credit", amount: input.amount },
        ],
      },
      tx as unknown as PrismaClient,
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
          notes: input.notes ?? `${chargeDef.name} posted to member share balance`,
          createdByUserId: input.actorUserId,
        },
        tx as unknown as PrismaClient,
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
        },
        occurredAt: new Date(),
      },
    })

    return application
  })
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
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", input.tx)
  const incomeAccount = await getLedgerAccountByCode(
    input.tenantId,
    input.isShareCharge ? "3200" : input.isMonthlyLevy ? "3100" : "3000",
    input.tx,
  )

  if (!savingsAccount || !incomeAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
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
        { ledgerAccountId: incomeAccount.id, direction: "debit", amount: input.amount },
        { ledgerAccountId: savingsAccount.id, direction: "credit", amount: input.amount },
      ],
    },
    input.tx,
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
      input.tx,
    )
  }
}

export async function waiveChargeApplication(
  input: {
    actorUserId: string
    chargeApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application) throw new Error("Charge application not found")
    if (application.status !== "posted") throw new Error("Only posted charge applications can be waived.")

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "waived",
        waivedAt: new Date(),
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      isShareCharge: (application.chargeDefinition as any).purpose === "member_share",
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
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application) throw new Error("Charge application not found")
    if (application.status !== "posted") throw new Error("Only posted charge applications can be reversed.")

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "reversed",
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      isShareCharge: (application.chargeDefinition as any).purpose === "member_share",
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
