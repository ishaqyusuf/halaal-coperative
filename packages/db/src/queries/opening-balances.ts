import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { ensureTenantLedgerAccounts, postLedgerTransaction } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"
import { createMemberShareLedgerEntry } from "./tenant-finance"

export type MemberOpeningBalanceStatus =
  | "pending_review"
  | "approved"
  | "applied"
  | "reversed"
  | "rejected"
  | "cancelled"

export type MemberOpeningBalanceRow = {
  activeFinancingOutstanding: number
  appliedAt: Date | null
  appliedByUserId: string | null
  appliedLoanId: string | null
  appliedProcurementRequestId: string | null
  commitmentSavingsBalance: number
  createdAt: Date
  createdByUserId: string | null
  id: string
  member: {
    fullName: string
    memberNumber: string
  }
  memberId: string
  notes: string | null
  openingDate: Date
  procurementOutstanding: number
  reviewedAt: Date | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  reversedAt: Date | null
  reversedByUserId: string | null
  reversalNotes: string | null
  shareCapitalBalance: number
  shareUnits: number | null
  sourceDocumentName: string | null
  sourceDocumentUrl: string | null
  specialSavingsBalance: number
  status: MemberOpeningBalanceStatus
  updatedAt: Date
}

type MemberOpeningBalanceInput = {
  activeFinancingOutstanding?: number
  commitmentSavingsBalance?: number
  memberId: string
  notes?: string | null
  openingDate: Date
  procurementOutstanding?: number
  shareCapitalBalance?: number
  shareUnits?: number | null
  sourceDocumentName?: string | null
  sourceDocumentUrl?: string | null
  specialSavingsBalance?: number
  tenantId: string
}

const memberOpeningBalanceStatuses = new Set([
  "pending_review",
  "approved",
  "applied",
  "reversed",
  "rejected",
  "cancelled",
])

function requireLedgerAccountId(
  accounts: Record<string, string>,
  code: string
) {
  const id = accounts[code]

  if (!id) {
    throw new Error(`Ledger account ${code} is not configured.`)
  }

  return id
}

function normalizeOpeningBalance(row: any): MemberOpeningBalanceRow {
  return {
    activeFinancingOutstanding: Number(row.activeFinancingOutstanding ?? 0),
    appliedAt: row.appliedAt ?? null,
    appliedByUserId: row.appliedByUserId ?? null,
    appliedLoanId: row.appliedLoanId ?? null,
    appliedProcurementRequestId: row.appliedProcurementRequestId ?? null,
    commitmentSavingsBalance: Number(row.commitmentSavingsBalance ?? 0),
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId ?? null,
    id: row.id,
    member: {
      fullName: row.member?.fullName ?? "Member",
      memberNumber: row.member?.memberNumber ?? "",
    },
    memberId: row.memberId,
    notes: row.notes ?? null,
    openingDate: row.openingDate,
    procurementOutstanding: Number(row.procurementOutstanding ?? 0),
    reviewedAt: row.reviewedAt ?? null,
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewNotes: row.reviewNotes ?? null,
    reversedAt: row.reversedAt ?? null,
    reversedByUserId: row.reversedByUserId ?? null,
    reversalNotes: row.reversalNotes ?? null,
    shareCapitalBalance: Number(row.shareCapitalBalance ?? 0),
    shareUnits:
      row.shareUnits === null || row.shareUnits === undefined
        ? null
        : Number(row.shareUnits),
    sourceDocumentName: row.sourceDocumentName ?? null,
    sourceDocumentUrl: row.sourceDocumentUrl ?? null,
    specialSavingsBalance: Number(row.specialSavingsBalance ?? 0),
    status: row.status,
    updatedAt: row.updatedAt,
  }
}

function openingBalanceInclude() {
  return {
    member: {
      select: {
        fullName: true,
        memberNumber: true,
      },
    },
  } as const
}

function startOfDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function assertNonNegativeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`)
  }
}

async function createOpeningFinancingObligation(
  input: {
    actorUserId: string
    appliedAt: Date
    openingBalance: any
    tenantId: string
  },
  prisma: any
): Promise<{
  loanId: string | null
  loanRequestId: string | null
  scheduleItemId: string | null
}> {
  const activeFinancingOutstanding = Number(
    input.openingBalance.activeFinancingOutstanding ?? 0
  )

  if (activeFinancingOutstanding <= 0) {
    return {
      loanId: null,
      loanRequestId: null,
      scheduleItemId: null,
    }
  }

  if (
    typeof prisma.loanProduct?.upsert !== "function" ||
    typeof prisma.loanRequest?.create !== "function" ||
    typeof prisma.loanApproval?.create !== "function" ||
    typeof prisma.loan?.create !== "function" ||
    typeof prisma.repaymentScheduleItem?.create !== "function"
  ) {
    throw new Error(
      "Opening financing obligations require the latest Prisma migration and generated client."
    )
  }

  const openingDate = input.openingBalance.openingDate
  const product = await prisma.loanProduct.upsert({
    create: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      name: "Brought-forward opening financing",
      tenantId: input.tenantId,
      termMonths: 1,
    },
    update: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      termMonths: 1,
    },
    where: {
      tenantId_name: {
        name: "Brought-forward opening financing",
        tenantId: input.tenantId,
      },
    },
  })

  const request = await prisma.loanRequest.create({
    data: {
      availablePoolSnapshot: 0,
      createdByUserId: input.actorUserId,
      eligibleAmountSnapshot: 0,
      estimatedMonthlyServicing: activeFinancingOutstanding,
      extraMonthlySavingsAmount: 0,
      loanProductId: product.id,
      memberId: input.openingBalance.memberId,
      purpose: "Brought-forward active financing balance",
      requestedAmount: activeFinancingOutstanding,
      requestedAt: openingDate,
      requestedTermMonths: 1,
      reviewNotes: "Approved as part of brought-forward opening balance.",
      status: "approved",
      tenantId: input.tenantId,
    },
  })

  await prisma.loanApproval.create({
    data: {
      action: "approved",
      actedAt: input.appliedAt,
      actorUserId: input.actorUserId,
      loanRequestId: request.id,
      notes: "Approved during brought-forward opening balance apply.",
      tenantId: input.tenantId,
    },
  })

  const loan = await prisma.loan.create({
    data: {
      disbursedAt: openingDate,
      estimatedMonthlyServicing: activeFinancingOutstanding,
      extraMonthlySavingsAmount: 0,
      firstRepaymentDueAt: openingDate,
      loanProductId: product.id,
      loanRequestId: request.id,
      memberId: input.openingBalance.memberId,
      outstandingPrincipal: activeFinancingOutstanding,
      principalAmount: activeFinancingOutstanding,
      status: "active",
      tenantId: input.tenantId,
      termMonths: 1,
    },
  })

  const scheduleItem = await prisma.repaymentScheduleItem.create({
    data: {
      amountPaid: 0,
      chargeDue: 0,
      dueAt: openingDate,
      installmentNumber: 1,
      loanId: loan.id,
      principalDue: activeFinancingOutstanding,
      status: "pending",
      tenantId: input.tenantId,
      totalDue: activeFinancingOutstanding,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.financing_posted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: loan.id,
      entityType: "Loan",
      metadata: {
        amount: activeFinancingOutstanding,
        dueAt: openingDate.toISOString(),
        loanRequestId: request.id,
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        scheduleItemId: scheduleItem.id ?? null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    loanId: loan.id,
    loanRequestId: request.id,
    scheduleItemId: scheduleItem.id ?? null,
  }
}

async function reverseOpeningFinancingObligation(
  input: {
    actorUserId: string
    openingBalance: any
    reversalNotes: string
    reversedAt: Date
    tenantId: string
  },
  prisma: any
): Promise<{
  loanId: string | null
  reversed: boolean
}> {
  const loanId = input.openingBalance.appliedLoanId ?? null

  if (!loanId) {
    return {
      loanId: null,
      reversed: false,
    }
  }

  if (typeof prisma.loan?.findFirst !== "function") {
    throw new Error(
      "Opening financing reversal requires the latest Prisma migration and generated client."
    )
  }

  const loan = await prisma.loan.findFirst({
    include: {
      repaymentScheduleItems: true,
      repayments: true,
    },
    where: {
      id: loanId,
      memberId: input.openingBalance.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!loan) {
    throw new Error("Linked opening financing obligation was not found.")
  }

  const repaymentTotal = (loan.repayments ?? []).reduce(
    (sum: number, repayment: any) => sum + Number(repayment.amount ?? 0),
    0
  )
  const schedulePaidTotal = (loan.repaymentScheduleItems ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.amountPaid ?? 0),
    0
  )

  if (repaymentTotal > 0 || schedulePaidTotal > 0) {
    throw new Error(
      "Opening balance reversal cannot cancel a financing obligation that already has repayment activity."
    )
  }

  if (
    typeof prisma.repaymentScheduleItem?.updateMany !== "function" ||
    typeof prisma.loan?.update !== "function"
  ) {
    throw new Error(
      "Opening financing reversal requires the latest Prisma migration and generated client."
    )
  }

  await prisma.repaymentScheduleItem.updateMany({
    data: {
      status: "waived",
    },
    where: {
      loanId,
      tenantId: input.tenantId,
    },
  })

  await prisma.loan.update({
    data: {
      closedAt: input.reversedAt,
      outstandingPrincipal: 0,
      status: "completed",
    },
    where: {
      id: loanId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.financing_reversed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: loanId,
      entityType: "Loan",
      metadata: {
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        reversedAt: input.reversedAt.toISOString(),
        reversalNotes: input.reversalNotes,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    loanId,
    reversed: true,
  }
}

async function readOpeningProcurementPolicy(
  tenantId: string,
  prisma: any
): Promise<{
  allowsCommitmentReductionDuringPayback: boolean
  policyMaximumPaybackMonths: number
}> {
  const defaultPolicy = {
    allowsCommitmentReductionDuringPayback: false,
    policyMaximumPaybackMonths: 12,
  }

  if (typeof prisma.tenantPolicy?.findUnique !== "function") {
    return defaultPolicy
  }

  const policy = await prisma.tenantPolicy.findUnique({
    select: {
      procurementAllowsCommitmentReductionDuringPayback: true,
      procurementMaximumPaybackMonths: true,
    },
    where: {
      tenantId,
    },
  })

  return {
    allowsCommitmentReductionDuringPayback:
      policy?.procurementAllowsCommitmentReductionDuringPayback ??
      defaultPolicy.allowsCommitmentReductionDuringPayback,
    policyMaximumPaybackMonths:
      Number(policy?.procurementMaximumPaybackMonths) ||
      defaultPolicy.policyMaximumPaybackMonths,
  }
}

async function createOpeningProcurementObligation(
  input: {
    actorUserId: string
    appliedAt: Date
    openingBalance: any
    tenantId: string
  },
  prisma: any
): Promise<{
  procurementRequestId: string | null
  scheduleItemId: string | null
}> {
  const procurementOutstanding = Number(
    input.openingBalance.procurementOutstanding ?? 0
  )

  if (procurementOutstanding <= 0) {
    return {
      procurementRequestId: null,
      scheduleItemId: null,
    }
  }

  if (
    typeof prisma.procurementRequest?.create !== "function" ||
    typeof prisma.procurementRepaymentScheduleItem?.create !== "function"
  ) {
    throw new Error(
      "Opening procurement obligations require the latest Prisma migration and generated client."
    )
  }

  const policy = await readOpeningProcurementPolicy(input.tenantId, prisma)
  const request = await prisma.procurementRequest.create({
    data: {
      allowsCommitmentReductionDuringPayback:
        policy.allowsCommitmentReductionDuringPayback,
      approvedCost: procurementOutstanding,
      approvedMonthlyRepayment: procurementOutstanding,
      approvedRepaymentMonths: 1,
      createdByUserId: input.actorUserId,
      estimatedMonthlyRepayment: procurementOutstanding,
      itemDescription:
        input.openingBalance.notes?.trim() ||
        "Opening procurement obligation imported from cooperative records.",
      itemName: "Brought-forward procurement balance",
      memberId: input.openingBalance.memberId,
      policyMaximumPaybackMonths: policy.policyMaximumPaybackMonths,
      purchaseNotes: "Brought-forward opening procurement obligation.",
      purchaseReference: `opening-balance:${input.openingBalance.id}:procurement`,
      purchasedAt: input.openingBalance.openingDate,
      purchasedByUserId: input.actorUserId,
      requestedAt: input.openingBalance.openingDate,
      requestedCost: procurementOutstanding,
      requestedRepaymentMonths: 1,
      reviewedAt: input.appliedAt,
      reviewedByUserId: input.actorUserId,
      reviewNotes: "Approved as part of brought-forward opening balance.",
      status: "active",
      tenantId: input.tenantId,
    },
  })

  const scheduleItem = await prisma.procurementRepaymentScheduleItem.create({
    data: {
      amount: procurementOutstanding,
      dueDate: input.openingBalance.openingDate,
      installmentNumber: 1,
      memberId: input.openingBalance.memberId,
      paidAmount: 0,
      procurementRequestId: request.id,
      status: "pending",
      tenantId: input.tenantId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.procurement_posted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: request.id,
      entityType: "ProcurementRequest",
      metadata: {
        amount: procurementOutstanding,
        dueDate: input.openingBalance.openingDate.toISOString(),
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        policyMaximumPaybackMonths: policy.policyMaximumPaybackMonths,
        scheduleItemId: scheduleItem.id ?? null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    procurementRequestId: request.id,
    scheduleItemId: scheduleItem.id ?? null,
  }
}

async function reverseOpeningProcurementObligation(
  input: {
    actorUserId: string
    openingBalance: any
    reversalNotes: string
    reversedAt: Date
    tenantId: string
  },
  prisma: any
): Promise<{
  procurementRequestId: string | null
  reversed: boolean
}> {
  const procurementRequestId =
    input.openingBalance.appliedProcurementRequestId ?? null

  if (!procurementRequestId) {
    return {
      procurementRequestId: null,
      reversed: false,
    }
  }

  if (typeof prisma.procurementRequest?.findFirst !== "function") {
    throw new Error(
      "Opening procurement reversal requires the latest Prisma migration and generated client."
    )
  }

  const request = await prisma.procurementRequest.findFirst({
    include: {
      repaymentScheduleItems: true,
    },
    where: {
      id: procurementRequestId,
      memberId: input.openingBalance.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!request) {
    throw new Error("Linked opening procurement obligation was not found.")
  }

  const scheduleItems = request.repaymentScheduleItems ?? []
  const paidAmount = scheduleItems.reduce(
    (sum: number, item: any) => sum + Number(item.paidAmount ?? 0),
    0
  )

  if (paidAmount > 0) {
    throw new Error(
      "Opening balance reversal cannot cancel a procurement obligation that already has repayment activity."
    )
  }

  if (
    typeof prisma.procurementRepaymentScheduleItem?.updateMany !== "function"
  ) {
    throw new Error(
      "Opening procurement reversal requires the latest Prisma migration and generated client."
    )
  }

  if (typeof prisma.procurementRequest?.update !== "function") {
    throw new Error(
      "Opening procurement reversal requires the latest Prisma migration and generated client."
    )
  }

  await prisma.procurementRepaymentScheduleItem.updateMany({
    data: {
      status: "waived",
    },
    where: {
      procurementRequestId,
      tenantId: input.tenantId,
    },
  })

  await prisma.procurementRequest.update({
    data: {
      purchaseNotes: `Reversed from opening balance: ${input.reversalNotes}`,
      status: "cancelled",
    },
    where: {
      id: procurementRequestId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.procurement_reversed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: procurementRequestId,
      entityType: "ProcurementRequest",
      metadata: {
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        reversedAt: input.reversedAt.toISOString(),
        reversalNotes: input.reversalNotes,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    procurementRequestId,
    reversed: true,
  }
}

function validateOpeningBalanceInput(input: MemberOpeningBalanceInput) {
  assertNonNegativeAmount(
    input.commitmentSavingsBalance ?? 0,
    "Commitment savings balance"
  )
  assertNonNegativeAmount(
    input.specialSavingsBalance ?? 0,
    "Special savings balance"
  )
  assertNonNegativeAmount(
    input.shareCapitalBalance ?? 0,
    "Share capital balance"
  )
  assertNonNegativeAmount(
    input.activeFinancingOutstanding ?? 0,
    "Active financing outstanding"
  )
  assertNonNegativeAmount(
    input.procurementOutstanding ?? 0,
    "Procurement outstanding"
  )

  if (
    input.shareUnits != null &&
    (!Number.isInteger(input.shareUnits) || input.shareUnits < 0)
  ) {
    throw new Error("Share units must be a whole number 0 or greater.")
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
    throw new Error("Opening balance actor does not belong to this tenant.")
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
    select: {
      id: true,
    },
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new Error("Opening balance member does not belong to this tenant.")
  }
}

async function assertOpeningBalanceMutationOpen(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (
    !migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites
  ) {
    throw new Error(
      "Member opening balances are locked because migration tools and live financial writes are closed."
    )
  }

  const [appliedMonths, appliedBatches, appliedOpeningBalances] =
    await Promise.all([
      typeof (prisma as any).appliedBackfillMonth?.findMany === "function"
        ? (prisma as any).appliedBackfillMonth.findMany({
            select: { id: true },
            take: 1,
            where: {
              memberId: input.memberId,
              tenantId: input.tenantId,
            },
          })
        : [],
      typeof (prisma as any).backfillBatch?.findMany === "function"
        ? (prisma as any).backfillBatch.findMany({
            select: { id: true },
            take: 1,
            where: {
              memberId: input.memberId,
              status: "applied",
              tenantId: input.tenantId,
            },
          })
        : [],
      typeof (prisma as any).memberOpeningBalance?.findMany === "function"
        ? (prisma as any).memberOpeningBalance.findMany({
            select: { id: true },
            take: 1,
            where: {
              memberId: input.memberId,
              status: "applied",
              tenantId: input.tenantId,
            },
          })
        : [],
    ])

  if (
    appliedMonths.length > 0 ||
    appliedBatches.length > 0 ||
    appliedOpeningBalances.length > 0
  ) {
    throw new Error(
      "This member's historical ledger has already been applied. Use correction workflows instead of opening-balance edits."
    )
  }
}

async function assertOpeningBalanceCorrectionOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (
    !migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites
  ) {
    throw new Error(
      "Member opening balance corrections are locked because migration tools and live financial writes are closed."
    )
  }
}

export async function listMemberOpeningBalances(
  input: {
    fromDate?: Date
    limit?: number
    memberId?: string
    status?: MemberOpeningBalanceStatus
    tenantId: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient
): Promise<MemberOpeningBalanceRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.memberOpeningBalance?.findMany !== "function") {
    return []
  }

  if (input.status && !memberOpeningBalanceStatuses.has(input.status)) {
    throw new Error("Opening balance status is not supported.")
  }

  const rows = await prisma.memberOpeningBalance.findMany({
    include: openingBalanceInclude(),
    orderBy: [{ openingDate: "desc" }, { createdAt: "desc" }],
    take: input.limit,
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.fromDate || input.toDate
        ? {
            openingDate: {
              ...(input.fromDate ? { gte: input.fromDate } : {}),
              ...(input.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    },
  })

  return rows.map(normalizeOpeningBalance)
}

export async function createMemberOpeningBalance(
  input: MemberOpeningBalanceInput & {
    actorUserId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberOpeningBalanceRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.memberOpeningBalance?.create !== "function") {
    throw new Error(
      "Member opening balances require the latest Prisma migration and generated client."
    )
  }

  validateOpeningBalanceInput(input)
  await assertActorBelongsToTenant(input, prisma)
  await assertMemberBelongsToTenant(input, prisma)
  await assertOpeningBalanceMutationOpen(input, prisma)

  const openingDate = startOfDay(input.openingDate)
  const created = await prisma.memberOpeningBalance.create({
    data: {
      activeFinancingOutstanding: input.activeFinancingOutstanding ?? 0,
      commitmentSavingsBalance: input.commitmentSavingsBalance ?? 0,
      createdByUserId: input.actorUserId,
      memberId: input.memberId,
      notes: input.notes?.trim() || null,
      openingDate,
      procurementOutstanding: input.procurementOutstanding ?? 0,
      shareCapitalBalance: input.shareCapitalBalance ?? 0,
      shareUnits: input.shareUnits ?? null,
      sourceDocumentName: input.sourceDocumentName?.trim() || null,
      sourceDocumentUrl: input.sourceDocumentUrl?.trim() || null,
      specialSavingsBalance: input.specialSavingsBalance ?? 0,
      tenantId: input.tenantId,
    },
    include: openingBalanceInclude(),
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: created.id,
      entityType: "MemberOpeningBalance",
      metadata: {
        activeFinancingOutstanding: input.activeFinancingOutstanding ?? 0,
        commitmentSavingsBalance: input.commitmentSavingsBalance ?? 0,
        hasSourceDocument: Boolean(input.sourceDocumentUrl),
        memberId: input.memberId,
        openingDate: openingDate.toISOString(),
        procurementOutstanding: input.procurementOutstanding ?? 0,
        shareCapitalBalance: input.shareCapitalBalance ?? 0,
        shareUnits: input.shareUnits ?? null,
        specialSavingsBalance: input.specialSavingsBalance ?? 0,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeOpeningBalance(created)
}

export async function reviewMemberOpeningBalance(
  input: {
    actorUserId: string
    decision: "approved" | "rejected"
    openingBalanceId: string
    reviewNotes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberOpeningBalanceRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.decision !== "approved" && input.decision !== "rejected") {
    throw new Error("Opening balance review must be approved or rejected.")
  }

  await assertActorBelongsToTenant(input, prisma)

  const existing = await prisma.memberOpeningBalance.findFirst({
    include: openingBalanceInclude(),
    where: {
      id: input.openingBalanceId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Opening balance was not found.")
  }

  await assertOpeningBalanceMutationOpen(
    {
      memberId: existing.memberId,
      tenantId: input.tenantId,
    },
    prisma
  )

  if (existing.status !== "pending_review") {
    throw new Error("Only pending opening balances can be reviewed.")
  }

  const reviewedAt = new Date()
  const updated = await prisma.memberOpeningBalance.update({
    data: {
      reviewedAt,
      reviewedByUserId: input.actorUserId,
      reviewNotes: input.reviewNotes?.trim() || null,
      status: input.decision,
    },
    include: openingBalanceInclude(),
    where: {
      id: input.openingBalanceId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.reviewed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.openingBalanceId,
      entityType: "MemberOpeningBalance",
      metadata: {
        memberId: existing.memberId,
        nextStatus: input.decision,
        previousStatus: existing.status,
        reviewNotes: input.reviewNotes?.trim() || null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeOpeningBalance(updated)
}

export async function applyMemberOpeningBalance(
  input: {
    actorUserId: string
    openingBalanceId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberOpeningBalanceRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertActorBelongsToTenant(input, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.memberOpeningBalance.findFirst({
      include: openingBalanceInclude(),
      where: {
        id: input.openingBalanceId,
        tenantId: input.tenantId,
      },
    })

    if (!existing) {
      throw new Error("Opening balance was not found.")
    }

    await assertOpeningBalanceMutationOpen(
      {
        memberId: existing.memberId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (existing.status !== "approved") {
      throw new Error("Only approved opening balances can be applied.")
    }

    const alreadyApplied = await tx.memberOpeningBalance.findFirst({
      select: { id: true },
      where: {
        id: { not: existing.id },
        memberId: existing.memberId,
        status: "applied",
        tenantId: input.tenantId,
      },
    })

    if (alreadyApplied) {
      throw new Error(
        "This member already has an applied opening balance. Use correction workflows for later changes."
      )
    }

    const commitmentSavingsBalance = Number(
      existing.commitmentSavingsBalance ?? 0
    )
    const specialSavingsBalance = Number(existing.specialSavingsBalance ?? 0)
    const savingsTotal = commitmentSavingsBalance + specialSavingsBalance
    const shareCapitalBalance = Number(existing.shareCapitalBalance ?? 0)
    const activeFinancingOutstanding = Number(
      existing.activeFinancingOutstanding ?? 0
    )
    const procurementOutstanding = Number(existing.procurementOutstanding ?? 0)
    const appliedAt = new Date()
    let savingsLedgerTransactionId: string | null = null
    let shareLedgerEntryId: string | null = null

    if (savingsTotal > 0) {
      const accounts = await ensureTenantLedgerAccounts(input.tenantId, tx)
      const memberSavingsAccountId = requireLedgerAccountId(accounts, "1000")
      const cooperativeEquityAccountId = requireLedgerAccountId(
        accounts,
        "4000"
      )
      const transaction = await postLedgerTransaction(
        {
          entries: [
            {
              amount: savingsTotal,
              direction: "debit",
              ledgerAccountId: cooperativeEquityAccountId,
            },
            {
              amount: savingsTotal,
              direction: "credit",
              ledgerAccountId: memberSavingsAccountId,
            },
          ],
          memberId: existing.memberId,
          narration: "Brought-forward opening savings balance",
          postedAt: existing.openingDate,
          reference: `opening-balance:${existing.id}:savings`,
          sourceType: "backfill",
          tenantId: input.tenantId,
          transactionType: "adjustment",
        },
        tx
      )
      savingsLedgerTransactionId = transaction.id

      await tx.member.update({
        data: {
          totalSavingsSnapshot: {
            increment: savingsTotal,
          },
        },
        where: {
          id: existing.memberId,
        },
      })
    }

    if (shareCapitalBalance > 0) {
      const shareEntry = await createMemberShareLedgerEntry(
        {
          amount: shareCapitalBalance,
          createdByUserId: input.actorUserId,
          effectiveDate: existing.openingDate,
          memberId: existing.memberId,
          notes: "Brought-forward opening share capital",
          sourceId: existing.id,
          sourceType: "backfill",
          tenantId: input.tenantId,
        },
        tx
      )
      shareLedgerEntryId = shareEntry.id
    }

    const financingPosting = await createOpeningFinancingObligation(
      {
        actorUserId: input.actorUserId,
        appliedAt,
        openingBalance: existing,
        tenantId: input.tenantId,
      },
      tx
    )

    const procurementPosting = await createOpeningProcurementObligation(
      {
        actorUserId: input.actorUserId,
        appliedAt,
        openingBalance: existing,
        tenantId: input.tenantId,
      },
      tx
    )

    const updated = await tx.memberOpeningBalance.update({
      data: {
        appliedAt,
        appliedByUserId: input.actorUserId,
        ...(financingPosting.loanId
          ? {
              appliedLoanId: financingPosting.loanId,
            }
          : {}),
        ...(procurementPosting.procurementRequestId
          ? {
              appliedProcurementRequestId:
                procurementPosting.procurementRequestId,
            }
          : {}),
        status: "applied",
      },
      include: openingBalanceInclude(),
      where: {
        id: existing.id,
      },
    })

    await createAuditLogEntry(
      {
        action: "migration.opening_balance.applied",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: existing.id,
        entityType: "MemberOpeningBalance",
        metadata: {
          appliedAt: appliedAt.toISOString(),
          activeFinancingOutstanding,
          commitmentSavingsBalance,
          loanId: financingPosting.loanId,
          loanRequestId: financingPosting.loanRequestId,
          loanScheduleItemId: financingPosting.scheduleItemId,
          procurementOutstanding,
          procurementRequestId: procurementPosting.procurementRequestId,
          procurementScheduleItemId: procurementPosting.scheduleItemId,
          memberId: existing.memberId,
          savingsLedgerTransactionId,
          savingsTotal,
          shareCapitalBalance,
          shareLedgerEntryId,
          shareUnits:
            existing.shareUnits === null || existing.shareUnits === undefined
              ? null
              : Number(existing.shareUnits),
          specialSavingsBalance,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeOpeningBalance(updated)
  })
}

export async function reverseMemberOpeningBalance(
  input: {
    actorUserId: string
    openingBalanceId: string
    reversalNotes: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberOpeningBalanceRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const reversalNotes = input.reversalNotes.trim()
  if (!reversalNotes) {
    throw new Error("Opening balance reversal notes are required.")
  }

  await assertActorBelongsToTenant(input, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.memberOpeningBalance.findFirst({
      include: openingBalanceInclude(),
      where: {
        id: input.openingBalanceId,
        tenantId: input.tenantId,
      },
    })

    if (!existing) {
      throw new Error("Opening balance was not found.")
    }

    await assertOpeningBalanceCorrectionOpen(input.tenantId, tx)

    if (existing.status !== "applied") {
      throw new Error("Only applied opening balances can be reversed.")
    }

    const commitmentSavingsBalance = Number(
      existing.commitmentSavingsBalance ?? 0
    )
    const specialSavingsBalance = Number(existing.specialSavingsBalance ?? 0)
    const savingsTotal = commitmentSavingsBalance + specialSavingsBalance
    const shareCapitalBalance = Number(existing.shareCapitalBalance ?? 0)
    const reversedAt = new Date()
    let savingsReversalLedgerTransactionId: string | null = null
    let shareReversalLedgerEntryId: string | null = null

    const financingReversal = await reverseOpeningFinancingObligation(
      {
        actorUserId: input.actorUserId,
        openingBalance: existing,
        reversalNotes,
        reversedAt,
        tenantId: input.tenantId,
      },
      tx
    )

    const procurementReversal = await reverseOpeningProcurementObligation(
      {
        actorUserId: input.actorUserId,
        openingBalance: existing,
        reversalNotes,
        reversedAt,
        tenantId: input.tenantId,
      },
      tx
    )

    if (savingsTotal > 0) {
      const member = await tx.member.findFirst({
        select: {
          id: true,
          totalSavingsSnapshot: true,
        },
        where: {
          id: existing.memberId,
          tenantId: input.tenantId,
        },
      })

      if (!member) {
        throw new Error(
          "Opening balance member does not belong to this tenant."
        )
      }

      if (Number(member.totalSavingsSnapshot ?? 0) < savingsTotal) {
        throw new Error(
          "Opening balance reversal would make the member savings snapshot negative. Use a controlled correction workflow instead."
        )
      }

      const accounts = await ensureTenantLedgerAccounts(input.tenantId, tx)
      const memberSavingsAccountId = requireLedgerAccountId(accounts, "1000")
      const cooperativeEquityAccountId = requireLedgerAccountId(
        accounts,
        "4000"
      )
      const transaction = await postLedgerTransaction(
        {
          entries: [
            {
              amount: savingsTotal,
              direction: "debit",
              ledgerAccountId: memberSavingsAccountId,
            },
            {
              amount: savingsTotal,
              direction: "credit",
              ledgerAccountId: cooperativeEquityAccountId,
            },
          ],
          memberId: existing.memberId,
          narration: "Reverse brought-forward opening savings balance",
          postedAt: reversedAt,
          reference: `opening-balance:${existing.id}:savings-reversal`,
          sourceType: "backfill",
          tenantId: input.tenantId,
          transactionType: "adjustment",
        },
        tx
      )
      savingsReversalLedgerTransactionId = transaction.id

      await tx.member.update({
        data: {
          totalSavingsSnapshot: {
            decrement: savingsTotal,
          },
        },
        where: {
          id: existing.memberId,
        },
      })
    }

    if (shareCapitalBalance > 0) {
      const shareEntry = await createMemberShareLedgerEntry(
        {
          amount: -shareCapitalBalance,
          createdByUserId: input.actorUserId,
          effectiveDate: reversedAt,
          memberId: existing.memberId,
          notes: "Reverse brought-forward opening share capital",
          sourceId: existing.id,
          sourceType: "backfill",
          tenantId: input.tenantId,
        },
        tx
      )
      shareReversalLedgerEntryId = shareEntry.id
    }

    const updated = await tx.memberOpeningBalance.update({
      data: {
        reversalNotes,
        reversedAt,
        reversedByUserId: input.actorUserId,
        status: "reversed",
      },
      include: openingBalanceInclude(),
      where: {
        id: existing.id,
      },
    })

    await createAuditLogEntry(
      {
        action: "migration.opening_balance.reversed",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: existing.id,
        entityType: "MemberOpeningBalance",
        metadata: {
          commitmentSavingsBalance,
          financingReversed: financingReversal.reversed,
          loanId: financingReversal.loanId,
          memberId: existing.memberId,
          procurementRequestId: procurementReversal.procurementRequestId,
          procurementReversed: procurementReversal.reversed,
          reversalNotes,
          reversedAt: reversedAt.toISOString(),
          savingsReversalLedgerTransactionId,
          savingsTotal,
          shareCapitalBalance,
          shareReversalLedgerEntryId,
          specialSavingsBalance,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeOpeningBalance(updated)
  })
}
