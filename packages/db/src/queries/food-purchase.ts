import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

export type FoodPurchaseCycleStatus =
  | "accounting_approved"
  | "accounting_rejected"
  | "accounting_submitted"
  | "cancelled"
  | "closed"
  | "open"

export type FoodPurchaseApplicationStatus =
  | "approved"
  | "cancelled"
  | "rejected"
  | "submitted"
  | "under_review"

type UserPreview = {
  email: string
  fullName: string
  id: string
}

export type FoodPurchaseCycleRow = {
  accountingNotes: string | null
  accountingSubmittedAt: Date | null
  accountingSubmittedByUser: UserPreview | null
  accountingSubmittedByUserId: string | null
  createdAt: Date
  id: string
  operatingExpenseAmount: number | null
  periodMonth: Date
  profitAmount: number | null
  purchaseCostAmount: number | null
  releasedAmount: number
  releasedAt: Date
  releasedByUser: UserPreview
  releasedByUserId: string
  releaseNotes: string | null
  salesAmount: number | null
  status: FoodPurchaseCycleStatus
  updatedAt: Date
}

export type FoodPurchaseApplicationRow = {
  approvedAmount: number | null
  approvedPaybackMonths: number | null
  allowsCommitmentReductionDuringPayback: boolean
  cycle: {
    id: string
    periodMonth: Date
    releasedAmount: number
    status: FoodPurchaseCycleStatus
  }
  cycleId: string
  createdAt: Date
  id: string
  itemDescription: string | null
  member: {
    email: string | null
    fullName: string
    id: string
    memberNumber: string
  }
  memberId: string
  paidAmount: number
  paidAt: Date | null
  policyMaximumPaybackMonths: number
  requestedAmount: number
  requestedPaybackMonths: number
  requestedAt: Date
  requestNotes: string | null
  reviewedAt: Date | null
  reviewedByUser: UserPreview | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  status: FoodPurchaseApplicationStatus
  submittedByUser: UserPreview
  submittedByUserId: string
  updatedAt: Date
}

const foodPurchaseCycleStatuses = new Set([
  "accounting_approved",
  "accounting_rejected",
  "accounting_submitted",
  "cancelled",
  "closed",
  "open",
])

const foodPurchaseApplicationStatuses = new Set([
  "approved",
  "cancelled",
  "rejected",
  "submitted",
  "under_review",
])

function trimOptional(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function assertPositiveAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`)
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }
}

function assertNonNegativeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`)
  }
}

function normalizePeriodMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function normalizeUserPreview(user: any): UserPreview {
  return {
    email: user.email,
    fullName: user.fullName,
    id: user.id,
  }
}

function normalizeFoodPurchaseCycle(cycle: any): FoodPurchaseCycleRow {
  return {
    accountingNotes: cycle.accountingNotes ?? null,
    accountingSubmittedAt: cycle.accountingSubmittedAt ?? null,
    accountingSubmittedByUser: cycle.accountingSubmittedByUser
      ? normalizeUserPreview(cycle.accountingSubmittedByUser)
      : null,
    accountingSubmittedByUserId: cycle.accountingSubmittedByUserId ?? null,
    createdAt: cycle.createdAt,
    id: cycle.id,
    operatingExpenseAmount:
      cycle.operatingExpenseAmount === null ||
      cycle.operatingExpenseAmount === undefined
        ? null
        : Number(cycle.operatingExpenseAmount),
    periodMonth: cycle.periodMonth,
    profitAmount:
      cycle.profitAmount === null || cycle.profitAmount === undefined
        ? null
        : Number(cycle.profitAmount),
    purchaseCostAmount:
      cycle.purchaseCostAmount === null ||
      cycle.purchaseCostAmount === undefined
        ? null
        : Number(cycle.purchaseCostAmount),
    releasedAmount: Number(cycle.releasedAmount),
    releasedAt: cycle.releasedAt,
    releasedByUser: normalizeUserPreview(cycle.releasedByUser),
    releasedByUserId: cycle.releasedByUserId,
    releaseNotes: cycle.releaseNotes ?? null,
    salesAmount:
      cycle.salesAmount === null || cycle.salesAmount === undefined
        ? null
        : Number(cycle.salesAmount),
    status: cycle.status,
    updatedAt: cycle.updatedAt,
  }
}

function normalizeFoodPurchaseApplication(
  application: any
): FoodPurchaseApplicationRow {
  return {
    approvedAmount:
      application.approvedAmount === null ||
      application.approvedAmount === undefined
        ? null
        : Number(application.approvedAmount),
    approvedPaybackMonths: application.approvedPaybackMonths ?? null,
    allowsCommitmentReductionDuringPayback:
      application.allowsCommitmentReductionDuringPayback ?? false,
    cycle: {
      id: application.cycle.id,
      periodMonth: application.cycle.periodMonth,
      releasedAmount: Number(application.cycle.releasedAmount),
      status: application.cycle.status,
    },
    cycleId: application.cycleId,
    createdAt: application.createdAt,
    id: application.id,
    itemDescription: application.itemDescription ?? null,
    member: {
      email: application.member.email ?? null,
      fullName: application.member.fullName,
      id: application.member.id,
      memberNumber: application.member.memberNumber,
    },
    memberId: application.memberId,
    paidAmount:
      application.paidAmount === null || application.paidAmount === undefined
        ? 0
        : Number(application.paidAmount),
    paidAt: application.paidAt ?? null,
    policyMaximumPaybackMonths: application.policyMaximumPaybackMonths ?? 1,
    requestedAmount: Number(application.requestedAmount),
    requestedPaybackMonths: application.requestedPaybackMonths ?? 1,
    requestedAt: application.requestedAt,
    requestNotes: application.requestNotes ?? null,
    reviewedAt: application.reviewedAt ?? null,
    reviewedByUser: application.reviewedByUser
      ? normalizeUserPreview(application.reviewedByUser)
      : null,
    reviewedByUserId: application.reviewedByUserId ?? null,
    reviewNotes: application.reviewNotes ?? null,
    status: application.status,
    submittedByUser: normalizeUserPreview(application.submittedByUser),
    submittedByUserId: application.submittedByUserId,
    updatedAt: application.updatedAt,
  }
}

function userSelect() {
  return {
    email: true,
    fullName: true,
    id: true,
  } as const
}

function cycleInclude() {
  return {
    accountingSubmittedByUser: {
      select: userSelect(),
    },
    releasedByUser: {
      select: userSelect(),
    },
  } as const
}

function applicationInclude() {
  return {
    cycle: {
      select: {
        id: true,
        periodMonth: true,
        releasedAmount: true,
        status: true,
      },
    },
    member: {
      select: {
        email: true,
        fullName: true,
        id: true,
        memberNumber: true,
      },
    },
    reviewedByUser: {
      select: userSelect(),
    },
    submittedByUser: {
      select: userSelect(),
    },
  } as const
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
}

async function assertActorBelongsToTenant(
  input: {
    actorUserId: string
    tenantId: string
  },
  prisma: any
) {
  if (typeof prisma.user?.findFirst !== "function") {
    return
  }

  const user = await prisma.user.findFirst({
    select: { id: true },
    where: {
      id: input.actorUserId,
      memberships: {
        some: {
          tenantId: input.tenantId,
        },
      },
    },
  })

  if (!user) {
    throw new Error("Foodstuff Purchase actor does not belong to this tenant.")
  }
}

async function assertMemberBelongsToTenant(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: any
) {
  const member = await prisma.member.findFirst({
    select: { id: true },
    where: {
      id: input.memberId,
      status: "active",
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new Error(
      "Foodstuff Purchase member does not belong to this cooperative."
    )
  }
}

async function readFoodPurchaseCycle(
  input: {
    cycleId: string
    tenantId: string
  },
  prisma: any
) {
  const cycle = await prisma.foodPurchaseCycle.findFirst({
    include: cycleInclude(),
    where: {
      id: input.cycleId,
      tenantId: input.tenantId,
    },
  })

  if (!cycle) {
    throw new Error("Foodstuff Purchase cycle was not found.")
  }

  return cycle
}

async function readFoodPurchaseApplication(
  input: {
    applicationId: string
    tenantId: string
  },
  prisma: any
) {
  const application = await prisma.foodPurchaseApplication.findFirst({
    include: applicationInclude(),
    where: {
      id: input.applicationId,
      tenantId: input.tenantId,
    },
  })

  if (!application) {
    throw new Error("Foodstuff Purchase application was not found.")
  }

  return application
}

async function getApprovedApplicationTotal(
  input: {
    cycleId: string
    excludeApplicationId?: string
    tenantId: string
  },
  prisma: any
) {
  if (typeof prisma.foodPurchaseApplication?.aggregate !== "function") {
    return 0
  }

  const approved = await prisma.foodPurchaseApplication.aggregate({
    _sum: { approvedAmount: true },
    where: {
      cycleId: input.cycleId,
      status: "approved",
      tenantId: input.tenantId,
      ...(input.excludeApplicationId
        ? { id: { not: input.excludeApplicationId } }
        : {}),
    },
  })

  return Number(approved._sum.approvedAmount ?? 0)
}

export async function listFoodPurchaseCycles(
  input: {
    limit?: number
    status?: FoodPurchaseCycleStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseCycleRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.foodPurchaseCycle?.findMany !== "function") {
    return []
  }

  if (input.status && !foodPurchaseCycleStatuses.has(input.status)) {
    throw new Error("Foodstuff Purchase cycle status is not supported.")
  }

  const cycles = await prisma.foodPurchaseCycle.findMany({
    include: cycleInclude(),
    orderBy: [{ periodMonth: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
    where: {
      tenantId: input.tenantId,
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return cycles.map(normalizeFoodPurchaseCycle)
}

export async function createFoodPurchaseCycle(
  input: {
    actorUserId: string
    periodMonth: Date
    releasedAmount: number
    releasedAt?: Date
    releaseNotes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseCycleRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.foodPurchaseCycle?.create !== "function") {
    throw new Error(
      "Foodstuff Purchase cycles require the latest Prisma migration and generated client."
    )
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)
  assertPositiveAmount(
    input.releasedAmount,
    "Released Foodstuff Purchase amount"
  )

  const periodMonth = normalizePeriodMonth(input.periodMonth)
  const existingCycle = await prisma.foodPurchaseCycle.findFirst({
    select: { id: true },
    where: {
      periodMonth,
      tenantId: input.tenantId,
    },
  })

  if (existingCycle) {
    throw new Error("Foodstuff Purchase cycle already exists for this month.")
  }

  return prisma.$transaction(async (tx: any) => {
    const cycle = await tx.foodPurchaseCycle.create({
      data: {
        periodMonth,
        releasedAmount: input.releasedAmount,
        releasedAt: input.releasedAt ?? new Date(),
        releasedByUserId: input.actorUserId,
        releaseNotes: trimOptional(input.releaseNotes),
        status: "open",
        tenantId: input.tenantId,
      },
      include: cycleInclude(),
    })

    await createAuditLogEntry(
      {
        action: "food_purchase.cycle_created",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: cycle.id,
        entityType: "FoodPurchaseCycle",
        metadata: {
          periodMonth: periodMonth.toISOString().slice(0, 10),
          releasedAmount: input.releasedAmount,
          releasedAt: cycle.releasedAt,
          releaseNotes: trimOptional(input.releaseNotes),
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeFoodPurchaseCycle(cycle)
  })
}

export async function listFoodPurchaseApplications(
  input: {
    cycleId?: string
    limit?: number
    memberId?: string
    status?: FoodPurchaseApplicationStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseApplicationRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.foodPurchaseApplication?.findMany !== "function") {
    return []
  }

  if (input.status && !foodPurchaseApplicationStatuses.has(input.status)) {
    throw new Error("Foodstuff Purchase application status is not supported.")
  }

  const applications = await prisma.foodPurchaseApplication.findMany({
    include: applicationInclude(),
    orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
    where: {
      tenantId: input.tenantId,
      ...(input.cycleId ? { cycleId: input.cycleId } : {}),
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return applications.map(normalizeFoodPurchaseApplication)
}

export async function submitFoodPurchaseApplication(
  input: {
    actorUserId: string
    cycleId: string
    itemDescription?: string | null
    memberId: string
    requestNotes?: string | null
    requestedAmount: number
    requestedPaybackMonths: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseApplicationRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.foodPurchaseApplication?.create !== "function") {
    throw new Error(
      "Foodstuff Purchase applications require the latest Prisma migration and generated client."
    )
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)
  await assertMemberBelongsToTenant(input, prisma)
  assertPositiveAmount(
    input.requestedAmount,
    "Requested Foodstuff Purchase amount"
  )
  assertPositiveInteger(
    input.requestedPaybackMonths,
    "Requested foodstuff payback months"
  )

  const policy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const foodPurchaseMaximumPaybackMonths = Number(
    policy?.foodPurchaseMaximumPaybackMonths ?? 1
  )

  if (input.requestedPaybackMonths > foodPurchaseMaximumPaybackMonths) {
    throw new Error(
      `Requested Foodstuff Purchase payback months cannot exceed ${foodPurchaseMaximumPaybackMonths}.`
    )
  }

  return prisma.$transaction(async (tx: any) => {
    const cycle = await readFoodPurchaseCycle(
      {
        cycleId: input.cycleId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (cycle.status !== "open") {
      throw new Error(
        "Foodstuff Purchase applications can only be submitted for an open cycle."
      )
    }

    const application = await tx.foodPurchaseApplication.create({
      data: {
        cycleId: input.cycleId,
        itemDescription: trimOptional(input.itemDescription),
        memberId: input.memberId,
        allowsCommitmentReductionDuringPayback:
          policy?.foodPurchaseAllowsCommitmentReductionDuringPayback ?? false,
        policyMaximumPaybackMonths: foodPurchaseMaximumPaybackMonths,
        requestedAmount: input.requestedAmount,
        requestedPaybackMonths: input.requestedPaybackMonths,
        requestedAt: new Date(),
        requestNotes: trimOptional(input.requestNotes),
        status: "submitted",
        submittedByUserId: input.actorUserId,
        tenantId: input.tenantId,
      },
      include: applicationInclude(),
    })

    await createAuditLogEntry(
      {
        action: "food_purchase.application_submitted",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: application.id,
        entityType: "FoodPurchaseApplication",
        metadata: {
          cycleId: input.cycleId,
          itemDescription: trimOptional(input.itemDescription),
          memberId: input.memberId,
          policyMaximumPaybackMonths: foodPurchaseMaximumPaybackMonths,
          requestedAmount: input.requestedAmount,
          requestedPaybackMonths: input.requestedPaybackMonths,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeFoodPurchaseApplication(application)
  })
}

export async function reviewFoodPurchaseApplication(
  input: {
    actorUserId: string
    applicationId: string
    approvedAmount?: number | null
    approvedPaybackMonths?: number | null
    notes?: string | null
    status: "approved" | "rejected" | "under_review"
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseApplicationRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)

  if (!foodPurchaseApplicationStatuses.has(input.status)) {
    throw new Error("Foodstuff Purchase application status is not supported.")
  }

  return prisma.$transaction(async (tx: any) => {
    const existingApplication = await readFoodPurchaseApplication(
      {
        applicationId: input.applicationId,
        tenantId: input.tenantId,
      },
      tx
    )
    const policy = await tx.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    })
    const foodPurchaseMaximumPaybackMonths = Number(
      policy?.foodPurchaseMaximumPaybackMonths ?? 1
    )

    if (!["submitted", "under_review"].includes(existingApplication.status)) {
      throw new Error(
        "Only pending Foodstuff Purchase applications can be reviewed."
      )
    }

    if (existingApplication.cycle.status !== "open") {
      throw new Error(
        "Foodstuff Purchase applications can only be reviewed while the cycle is open."
      )
    }

    const approvedAmount =
      input.status === "approved"
        ? (input.approvedAmount ?? Number(existingApplication.requestedAmount))
        : null
    const approvedPaybackMonths =
      input.status === "approved"
        ? (input.approvedPaybackMonths ??
          existingApplication.requestedPaybackMonths)
        : null

    if (input.status === "approved") {
      const approvedApplicationAmount =
        approvedAmount ?? Number(existingApplication.requestedAmount)
      const approvedApplicationPaybackMonths =
        approvedPaybackMonths ?? existingApplication.requestedPaybackMonths

      assertPositiveAmount(
        approvedApplicationAmount,
        "Approved Foodstuff Purchase amount"
      )
      assertPositiveInteger(
        approvedApplicationPaybackMonths,
        "Approved foodstuff payback months"
      )

      if (approvedApplicationPaybackMonths > foodPurchaseMaximumPaybackMonths) {
        throw new Error(
          `Approved Foodstuff Purchase payback months cannot exceed ${foodPurchaseMaximumPaybackMonths}.`
        )
      }

      const alreadyApprovedTotal = await getApprovedApplicationTotal(
        {
          cycleId: existingApplication.cycleId,
          excludeApplicationId: existingApplication.id,
          tenantId: input.tenantId,
        },
        tx
      )
      const availableAmount =
        Number(existingApplication.cycle.releasedAmount) - alreadyApprovedTotal

      if (approvedApplicationAmount > availableAmount) {
        throw new Error(
          "Approved Foodstuff Purchase amount exceeds the remaining released committee funds."
        )
      }
    }

    const application = await tx.foodPurchaseApplication.update({
      where: { id: existingApplication.id },
      data: {
        approvedAmount,
        approvedPaybackMonths,
        allowsCommitmentReductionDuringPayback:
          input.status === "approved"
            ? (policy?.foodPurchaseAllowsCommitmentReductionDuringPayback ??
              false)
            : existingApplication.allowsCommitmentReductionDuringPayback,
        policyMaximumPaybackMonths:
          input.status === "approved"
            ? foodPurchaseMaximumPaybackMonths
            : existingApplication.policyMaximumPaybackMonths,
        reviewedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        reviewNotes: trimOptional(input.notes),
        status: input.status,
      },
      include: applicationInclude(),
    })

    await createAuditLogEntry(
      {
        action: `food_purchase.application_${input.status}`,
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: application.id,
        entityType: "FoodPurchaseApplication",
        metadata: {
          approvedAmount,
          approvedPaybackMonths,
          allowsCommitmentReductionDuringPayback:
            input.status === "approved"
              ? (policy?.foodPurchaseAllowsCommitmentReductionDuringPayback ??
                false)
              : existingApplication.allowsCommitmentReductionDuringPayback,
          cycleId: application.cycleId,
          memberId: application.memberId,
          notes: trimOptional(input.notes),
          policyMaximumPaybackMonths:
            input.status === "approved"
              ? foodPurchaseMaximumPaybackMonths
              : existingApplication.policyMaximumPaybackMonths,
          previousStatus: existingApplication.status,
          status: input.status,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeFoodPurchaseApplication(application)
  })
}

export async function recordFoodPurchaseAccounting(
  input: {
    actorUserId: string
    cycleId: string
    notes?: string | null
    operatingExpenseAmount?: number
    purchaseCostAmount: number
    salesAmount: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseCycleRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)
  assertNonNegativeAmount(input.salesAmount, "Foodstuff Purchase sales amount")
  assertNonNegativeAmount(
    input.purchaseCostAmount,
    "Foodstuff Purchase cost amount"
  )
  assertNonNegativeAmount(
    input.operatingExpenseAmount ?? 0,
    "Foodstuff Purchase operating expense amount"
  )

  return prisma.$transaction(async (tx: any) => {
    const existingCycle = await readFoodPurchaseCycle(
      {
        cycleId: input.cycleId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (!["accounting_rejected", "open"].includes(existingCycle.status)) {
      throw new Error(
        "Foodstuff Purchase accounting can only be submitted for an open or correction cycle."
      )
    }

    const operatingExpenseAmount = input.operatingExpenseAmount ?? 0
    const profitAmount =
      input.salesAmount - input.purchaseCostAmount - operatingExpenseAmount

    const cycle = await tx.foodPurchaseCycle.update({
      where: { id: existingCycle.id },
      data: {
        accountingNotes: trimOptional(input.notes),
        accountingSubmittedAt: new Date(),
        accountingSubmittedByUserId: input.actorUserId,
        operatingExpenseAmount,
        profitAmount,
        purchaseCostAmount: input.purchaseCostAmount,
        salesAmount: input.salesAmount,
        status: "accounting_submitted",
      },
      include: cycleInclude(),
    })

    await createAuditLogEntry(
      {
        action: "food_purchase.accounting_submitted",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: cycle.id,
        entityType: "FoodPurchaseCycle",
        metadata: {
          notes: trimOptional(input.notes),
          operatingExpenseAmount,
          previousStatus: existingCycle.status,
          profitAmount,
          purchaseCostAmount: input.purchaseCostAmount,
          salesAmount: input.salesAmount,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeFoodPurchaseCycle(cycle)
  })
}

export async function reviewFoodPurchaseAccounting(
  input: {
    actorUserId: string
    cycleId: string
    decision: "approved" | "rejected"
    notes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<FoodPurchaseCycleRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existingCycle = await readFoodPurchaseCycle(
      {
        cycleId: input.cycleId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (existingCycle.status !== "accounting_submitted") {
      throw new Error(
        "Only submitted Foodstuff Purchase accounting can be reviewed."
      )
    }

    const status =
      input.decision === "approved"
        ? "accounting_approved"
        : "accounting_rejected"
    const notes = trimOptional(input.notes)
    const cycle = await tx.foodPurchaseCycle.update({
      where: { id: existingCycle.id },
      data: {
        status,
      },
      include: cycleInclude(),
    })

    await createAuditLogEntry(
      {
        action: `food_purchase.${status}`,
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: cycle.id,
        entityType: "FoodPurchaseCycle",
        metadata: {
          decision: input.decision,
          notes,
          previousStatus: existingCycle.status,
          profitAmount:
            existingCycle.profitAmount === null ||
            existingCycle.profitAmount === undefined
              ? null
              : Number(existingCycle.profitAmount),
          status,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeFoodPurchaseCycle(cycle)
  })
}
