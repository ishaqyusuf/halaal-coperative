import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
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
  activeFinancingOriginalAmount: number
  activeFinancingGuarantorOneMemberId: string | null
  activeFinancingGuarantorTwoMemberId: string | null
  activeFinancingInstallmentAmount: number
  activeFinancingInstallmentsPaid: number | null
  activeFinancingOpenedAt: Date | null
  activeFinancingRepaymentMonths: number | null
  appliedAt: Date | null
  appliedFoodPurchaseApplicationId: string | null
  appliedByUserId: string | null
  appliedLoanId: string | null
  appliedProcurementRequestId: string | null
  commitmentSavingsBalance: number
  createdAt: Date
  createdByUserId: string | null
  foodPurchaseOutstanding: number
  foodPurchaseInstallmentAmount: number
  foodPurchaseInstallmentsPaid: number | null
  foodPurchaseItemName: string | null
  foodPurchaseOpenedAt: Date | null
  foodPurchaseOriginalAmount: number
  foodPurchaseRepaymentMonths: number | null
  id: string
  member: {
    fullName: string
    memberNumber: string
  }
  memberId: string
  notes: string | null
  openingDate: Date
  procurementOutstanding: number
  procurementInstallmentAmount: number
  procurementInstallmentsPaid: number | null
  procurementItemName: string | null
  procurementOpenedAt: Date | null
  procurementOriginalAmount: number
  procurementRepaymentMonths: number | null
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
  activeFinancingOriginalAmount?: number
  activeFinancingGuarantorOneMemberId?: string | null
  activeFinancingGuarantorTwoMemberId?: string | null
  activeFinancingInstallmentAmount?: number
  activeFinancingInstallmentsPaid?: number | null
  activeFinancingOpenedAt?: Date | null
  activeFinancingRepaymentMonths?: number | null
  commitmentSavingsBalance?: number
  foodPurchaseOutstanding?: number
  foodPurchaseInstallmentAmount?: number
  foodPurchaseInstallmentsPaid?: number | null
  foodPurchaseItemName?: string | null
  foodPurchaseOpenedAt?: Date | null
  foodPurchaseOriginalAmount?: number
  foodPurchaseRepaymentMonths?: number | null
  memberId: string
  notes?: string | null
  openingDate: Date
  procurementOutstanding?: number
  procurementInstallmentAmount?: number
  procurementInstallmentsPaid?: number | null
  procurementItemName?: string | null
  procurementOpenedAt?: Date | null
  procurementOriginalAmount?: number
  procurementRepaymentMonths?: number | null
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
    activeFinancingOriginalAmount: Number(
      row.activeFinancingOriginalAmount ?? 0
    ),
    activeFinancingGuarantorOneMemberId:
      row.activeFinancingGuarantorOneMemberId ?? null,
    activeFinancingGuarantorTwoMemberId:
      row.activeFinancingGuarantorTwoMemberId ?? null,
    activeFinancingInstallmentAmount: Number(
      row.activeFinancingInstallmentAmount ?? 0
    ),
    activeFinancingInstallmentsPaid:
      row.activeFinancingInstallmentsPaid == null
        ? null
        : Number(row.activeFinancingInstallmentsPaid),
    activeFinancingOpenedAt: row.activeFinancingOpenedAt ?? null,
    activeFinancingRepaymentMonths:
      row.activeFinancingRepaymentMonths == null
        ? null
        : Number(row.activeFinancingRepaymentMonths),
    appliedAt: row.appliedAt ?? null,
    appliedFoodPurchaseApplicationId:
      row.appliedFoodPurchaseApplicationId ?? null,
    appliedByUserId: row.appliedByUserId ?? null,
    appliedLoanId: row.appliedLoanId ?? null,
    appliedProcurementRequestId: row.appliedProcurementRequestId ?? null,
    commitmentSavingsBalance: Number(row.commitmentSavingsBalance ?? 0),
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId ?? null,
    foodPurchaseOutstanding: Number(row.foodPurchaseOutstanding ?? 0),
    foodPurchaseInstallmentAmount: Number(
      row.foodPurchaseInstallmentAmount ?? 0
    ),
    foodPurchaseInstallmentsPaid:
      row.foodPurchaseInstallmentsPaid == null
        ? null
        : Number(row.foodPurchaseInstallmentsPaid),
    foodPurchaseItemName: row.foodPurchaseItemName ?? null,
    foodPurchaseOpenedAt: row.foodPurchaseOpenedAt ?? null,
    foodPurchaseOriginalAmount: Number(row.foodPurchaseOriginalAmount ?? 0),
    foodPurchaseRepaymentMonths:
      row.foodPurchaseRepaymentMonths == null
        ? null
        : Number(row.foodPurchaseRepaymentMonths),
    id: row.id,
    member: {
      fullName: row.member?.fullName ?? "Member",
      memberNumber: row.member?.memberNumber ?? "",
    },
    memberId: row.memberId,
    notes: row.notes ?? null,
    openingDate: row.openingDate,
    procurementOutstanding: Number(row.procurementOutstanding ?? 0),
    procurementInstallmentAmount: Number(row.procurementInstallmentAmount ?? 0),
    procurementInstallmentsPaid:
      row.procurementInstallmentsPaid == null
        ? null
        : Number(row.procurementInstallmentsPaid),
    procurementItemName: row.procurementItemName ?? null,
    procurementOpenedAt: row.procurementOpenedAt ?? null,
    procurementOriginalAmount: Number(row.procurementOriginalAmount ?? 0),
    procurementRepaymentMonths:
      row.procurementRepaymentMonths == null
        ? null
        : Number(row.procurementRepaymentMonths),
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
    throw ExpectedQueryError.validation(`${label} cannot be negative.`)
  }
}

function assertWholeNumberOrNull(
  value: number | null | undefined,
  label: string
) {
  if (value == null) {
    return
  }

  if (!Number.isInteger(value) || value < 0) {
    throw ExpectedQueryError.validation(
      `${label} must be a whole number 0 or greater.`
    )
  }
}

function validateOpeningObligationPlan({
  installmentsPaid,
  label,
  originalAmount,
  repaymentMonths,
  outstandingAmount,
}: {
  installmentsPaid?: number | null
  label: string
  originalAmount?: number
  outstandingAmount?: number
  repaymentMonths?: number | null
}) {
  assertNonNegativeAmount(originalAmount ?? 0, `${label} original amount`)
  assertNonNegativeAmount(outstandingAmount ?? 0, `${label} outstanding amount`)
  assertWholeNumberOrNull(repaymentMonths, `${label} repayment months`)
  assertWholeNumberOrNull(installmentsPaid, `${label} installments paid`)

  if (
    originalAmount != null &&
    originalAmount > 0 &&
    outstandingAmount != null &&
    outstandingAmount > originalAmount
  ) {
    throw ExpectedQueryError.validation(
      `${label} outstanding amount cannot exceed original amount.`
    )
  }

  if (
    repaymentMonths != null &&
    repaymentMonths > 0 &&
    installmentsPaid != null &&
    installmentsPaid > repaymentMonths
  ) {
    throw ExpectedQueryError.validation(
      `${label} paid installments cannot exceed repayment months.`
    )
  }
}

function addUtcMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate()
    )
  )
}

function getRemainingInstallmentCount({
  installmentsPaid,
  outstandingAmount,
  repaymentMonths,
}: {
  installmentsPaid?: number | null
  outstandingAmount: number
  repaymentMonths?: number | null
}) {
  if (outstandingAmount <= 0) {
    return 0
  }

  if (!repaymentMonths || repaymentMonths <= 0) {
    return 1
  }

  return Math.max(1, repaymentMonths - (installmentsPaid ?? 0))
}

function buildRemainingInstallments({
  installmentAmount,
  installmentsPaid,
  openingDate,
  outstandingAmount,
  repaymentMonths,
}: {
  installmentAmount?: number
  installmentsPaid?: number | null
  openingDate: Date
  outstandingAmount: number
  repaymentMonths?: number | null
}) {
  const count = getRemainingInstallmentCount({
    installmentsPaid,
    outstandingAmount,
    repaymentMonths,
  })

  if (count === 0) {
    return []
  }

  const regularAmount =
    installmentAmount && installmentAmount > 0
      ? installmentAmount
      : outstandingAmount / count
  let remaining = outstandingAmount

  return Array.from({ length: count }, (_, index) => {
    const amount =
      index === count - 1 ? remaining : Math.min(regularAmount, remaining)
    remaining = Math.max(0, remaining - amount)

    return {
      amount,
      dueAt: addUtcMonths(openingDate, index),
      installmentNumber: (installmentsPaid ?? 0) + index + 1,
    }
  })
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
  guarantorApprovalIds: string[]
  loanId: string | null
  loanRequestId: string | null
  scheduleItemId: string | null
}> {
  const activeFinancingOutstanding = Number(
    input.openingBalance.activeFinancingOutstanding ?? 0
  )

  if (activeFinancingOutstanding <= 0) {
    return {
      guarantorApprovalIds: [],
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
  const financingOpenedAt =
    input.openingBalance.activeFinancingOpenedAt ?? openingDate
  const originalAmount =
    Number(input.openingBalance.activeFinancingOriginalAmount ?? 0) ||
    activeFinancingOutstanding
  const repaymentMonths =
    input.openingBalance.activeFinancingRepaymentMonths == null
      ? 1
      : Number(input.openingBalance.activeFinancingRepaymentMonths)
  const installmentsPaid =
    input.openingBalance.activeFinancingInstallmentsPaid == null
      ? 0
      : Number(input.openingBalance.activeFinancingInstallmentsPaid)
  const installmentAmount = Number(
    input.openingBalance.activeFinancingInstallmentAmount ?? 0
  )
  const remainingInstallments = buildRemainingInstallments({
    installmentAmount,
    installmentsPaid,
    openingDate,
    outstandingAmount: activeFinancingOutstanding,
    repaymentMonths,
  })
  const monthlyServicing =
    installmentAmount > 0
      ? installmentAmount
      : (remainingInstallments[0]?.amount ?? activeFinancingOutstanding)
  const guarantorMemberIds = Array.from(
    new Set(
      [
        input.openingBalance.activeFinancingGuarantorOneMemberId,
        input.openingBalance.activeFinancingGuarantorTwoMemberId,
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    )
  )
  const product = await prisma.loanProduct.upsert({
    create: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      name: "Brought-forward opening financing",
      tenantId: input.tenantId,
      termMonths: repaymentMonths || 1,
    },
    update: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      termMonths: repaymentMonths || 1,
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
      estimatedMonthlyServicing: monthlyServicing,
      extraMonthlySavingsAmount: 0,
      loanProductId: product.id,
      memberId: input.openingBalance.memberId,
      purpose: "Brought-forward active financing balance",
      requestedAmount: originalAmount,
      requestedAt: financingOpenedAt,
      requestedTermMonths: repaymentMonths || 1,
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

  const guarantorApprovalIds: string[] = []
  if (guarantorMemberIds.length > 0) {
    if (typeof prisma.loanGuarantorApproval?.create !== "function") {
      throw new Error(
        "Opening financing guarantors require the latest Prisma migration and generated client."
      )
    }

    for (const guarantorMemberId of guarantorMemberIds) {
      const approval = await prisma.loanGuarantorApproval.create({
        data: {
          guarantorMemberId,
          loanRequestId: request.id,
          requestedAt: financingOpenedAt,
          requestedByUserId: input.actorUserId,
          respondedAt: input.appliedAt,
          respondedByUserId: input.actorUserId,
          responseNotes:
            "Accepted as part of brought-forward opening financing evidence.",
          status: "approved",
          tenantId: input.tenantId,
        },
      })
      guarantorApprovalIds.push(approval.id)
    }
  }

  const loan = await prisma.loan.create({
    data: {
      disbursedAt: financingOpenedAt,
      estimatedMonthlyServicing: monthlyServicing,
      extraMonthlySavingsAmount: 0,
      firstRepaymentDueAt: financingOpenedAt,
      loanProductId: product.id,
      loanRequestId: request.id,
      memberId: input.openingBalance.memberId,
      outstandingPrincipal: activeFinancingOutstanding,
      principalAmount: originalAmount,
      status: "active",
      tenantId: input.tenantId,
      termMonths: repaymentMonths || remainingInstallments.length || 1,
    },
  })

  let firstScheduleItemId: string | null = null
  for (const installment of remainingInstallments) {
    const scheduleItem = await prisma.repaymentScheduleItem.create({
      data: {
        amountPaid: 0,
        chargeDue: 0,
        dueAt: installment.dueAt,
        installmentNumber: installment.installmentNumber,
        loanId: loan.id,
        principalDue: installment.amount,
        status: "pending",
        tenantId: input.tenantId,
        totalDue: installment.amount,
      },
    })
    firstScheduleItemId ??= scheduleItem.id ?? null
  }

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.financing_posted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: loan.id,
      entityType: "Loan",
      metadata: {
        amount: activeFinancingOutstanding,
        dueAt: financingOpenedAt.toISOString(),
        guarantorApprovalIds,
        guarantorMemberIds,
        installmentAmount,
        installmentsPaid,
        loanRequestId: request.id,
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        originalAmount,
        remainingInstallmentCount: remainingInstallments.length,
        repaymentMonths,
        scheduleItemId: firstScheduleItemId,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    guarantorApprovalIds,
    loanId: loan.id,
    loanRequestId: request.id,
    scheduleItemId: firstScheduleItemId,
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
    throw ExpectedQueryError.notFound(
      "Linked opening financing obligation was not found."
    )
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
    throw ExpectedQueryError.conflict(
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
  const openedAt =
    input.openingBalance.procurementOpenedAt ?? input.openingBalance.openingDate
  const originalAmount =
    Number(input.openingBalance.procurementOriginalAmount ?? 0) ||
    procurementOutstanding
  const repaymentMonths =
    input.openingBalance.procurementRepaymentMonths == null
      ? 1
      : Number(input.openingBalance.procurementRepaymentMonths)
  const installmentsPaid =
    input.openingBalance.procurementInstallmentsPaid == null
      ? 0
      : Number(input.openingBalance.procurementInstallmentsPaid)
  const installmentAmount = Number(
    input.openingBalance.procurementInstallmentAmount ?? 0
  )
  const remainingInstallments = buildRemainingInstallments({
    installmentAmount,
    installmentsPaid,
    openingDate: input.openingBalance.openingDate,
    outstandingAmount: procurementOutstanding,
    repaymentMonths,
  })
  const monthlyRepayment =
    installmentAmount > 0
      ? installmentAmount
      : (remainingInstallments[0]?.amount ?? procurementOutstanding)
  const itemName =
    input.openingBalance.procurementItemName?.trim() ||
    "Brought-forward procurement balance"

  const request = await prisma.procurementRequest.create({
    data: {
      allowsCommitmentReductionDuringPayback:
        policy.allowsCommitmentReductionDuringPayback,
      approvedCost: originalAmount,
      approvedMonthlyRepayment: monthlyRepayment,
      approvedRepaymentMonths: repaymentMonths || 1,
      createdByUserId: input.actorUserId,
      estimatedMonthlyRepayment: monthlyRepayment,
      itemDescription:
        input.openingBalance.notes?.trim() ||
        "Opening procurement obligation imported from cooperative records.",
      itemName,
      memberId: input.openingBalance.memberId,
      policyMaximumPaybackMonths: policy.policyMaximumPaybackMonths,
      purchaseNotes: "Brought-forward opening procurement obligation.",
      purchaseReference: `opening-balance:${input.openingBalance.id}:procurement`,
      purchasedAt: openedAt,
      purchasedByUserId: input.actorUserId,
      requestedAt: openedAt,
      requestedCost: originalAmount,
      requestedRepaymentMonths: repaymentMonths || 1,
      reviewedAt: input.appliedAt,
      reviewedByUserId: input.actorUserId,
      reviewNotes: "Approved as part of brought-forward opening balance.",
      status: "active",
      tenantId: input.tenantId,
    },
  })

  let firstScheduleItemId: string | null = null
  for (const installment of remainingInstallments) {
    const scheduleItem = await prisma.procurementRepaymentScheduleItem.create({
      data: {
        amount: installment.amount,
        dueDate: installment.dueAt,
        installmentNumber: installment.installmentNumber,
        memberId: input.openingBalance.memberId,
        paidAmount: 0,
        procurementRequestId: request.id,
        status: "pending",
        tenantId: input.tenantId,
      },
    })
    firstScheduleItemId ??= scheduleItem.id ?? null
  }

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
        installmentAmount,
        installmentsPaid,
        itemName,
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        originalAmount,
        policyMaximumPaybackMonths: policy.policyMaximumPaybackMonths,
        remainingInstallmentCount: remainingInstallments.length,
        repaymentMonths,
        scheduleItemId: firstScheduleItemId,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    procurementRequestId: request.id,
    scheduleItemId: firstScheduleItemId,
  }
}

async function createOpeningFoodPurchaseObligation(
  input: {
    actorUserId: string
    appliedAt: Date
    openingBalance: any
    tenantId: string
  },
  prisma: any
): Promise<{
  cycleId: string | null
  foodPurchaseApplicationId: string | null
}> {
  const foodPurchaseOutstanding = Number(
    input.openingBalance.foodPurchaseOutstanding ?? 0
  )

  if (foodPurchaseOutstanding <= 0) {
    return {
      cycleId: null,
      foodPurchaseApplicationId: null,
    }
  }

  if (
    typeof prisma.foodPurchaseCycle?.upsert !== "function" ||
    typeof prisma.foodPurchaseApplication?.create !== "function"
  ) {
    throw new Error(
      "Opening Food Purchase obligations require the latest Prisma migration and generated client."
    )
  }

  const openingDate = input.openingBalance.openingDate
  const openedAt = input.openingBalance.foodPurchaseOpenedAt ?? openingDate
  const originalAmount =
    Number(input.openingBalance.foodPurchaseOriginalAmount ?? 0) ||
    foodPurchaseOutstanding
  const repaymentMonths =
    input.openingBalance.foodPurchaseRepaymentMonths == null
      ? 1
      : Number(input.openingBalance.foodPurchaseRepaymentMonths)
  const installmentAmount = Number(
    input.openingBalance.foodPurchaseInstallmentAmount ?? 0
  )
  const paidAmount = Math.max(0, originalAmount - foodPurchaseOutstanding)
  const itemName =
    input.openingBalance.foodPurchaseItemName?.trim() ||
    "Brought-forward Food Purchase balance"
  const periodMonth = new Date(
    Date.UTC(openingDate.getUTCFullYear(), openingDate.getUTCMonth(), 1)
  )
  const policy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const policyMaximumPaybackMonths = Number(
    policy?.foodPurchaseMaximumPaybackMonths ?? 1
  )
  const cycle = await prisma.foodPurchaseCycle.upsert({
    create: {
      periodMonth,
      releaseNotes:
        "Brought-forward Food Purchase cycle imported from cooperative records.",
      releasedAmount: foodPurchaseOutstanding,
      releasedAt: input.appliedAt,
      releasedByUserId: input.actorUserId,
      status: "open",
      tenantId: input.tenantId,
    },
    update: {
      releasedAmount: {
        increment: foodPurchaseOutstanding,
      },
    },
    where: {
      tenantId_periodMonth: {
        periodMonth,
        tenantId: input.tenantId,
      },
    },
  })

  const application = await prisma.foodPurchaseApplication.create({
    data: {
      allowsCommitmentReductionDuringPayback:
        policy?.foodPurchaseAllowsCommitmentReductionDuringPayback ?? false,
      approvedAmount: originalAmount,
      approvedPaybackMonths: repaymentMonths || 1,
      cycleId: cycle.id,
      itemDescription: itemName,
      memberId: input.openingBalance.memberId,
      paidAmount,
      policyMaximumPaybackMonths,
      requestedAmount: originalAmount,
      requestedAt: openedAt,
      requestedPaybackMonths: repaymentMonths || 1,
      requestNotes:
        input.openingBalance.notes?.trim() ||
        "Opening Food Purchase obligation imported from cooperative records.",
      reviewedAt: input.appliedAt,
      reviewedByUserId: input.actorUserId,
      reviewNotes: "Approved as part of brought-forward opening balance.",
      status: "approved",
      submittedByUserId: input.actorUserId,
      tenantId: input.tenantId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.food_purchase_posted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: application.id,
      entityType: "FoodPurchaseApplication",
      metadata: {
        amount: foodPurchaseOutstanding,
        cycleId: cycle.id,
        installmentAmount,
        installmentsPaid: input.openingBalance.foodPurchaseInstallmentsPaid,
        itemName,
        memberId: input.openingBalance.memberId,
        openingBalanceId: input.openingBalance.id,
        originalAmount,
        paidAmount,
        policyMaximumPaybackMonths,
        repaymentMonths,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    cycleId: cycle.id,
    foodPurchaseApplicationId: application.id,
  }
}

async function reverseOpeningFoodPurchaseObligation(
  input: {
    actorUserId: string
    openingBalance: any
    reversalNotes: string
    reversedAt: Date
    tenantId: string
  },
  prisma: any
): Promise<{
  foodPurchaseApplicationId: string | null
  reversed: boolean
}> {
  const foodPurchaseApplicationId =
    input.openingBalance.appliedFoodPurchaseApplicationId ?? null

  if (!foodPurchaseApplicationId) {
    return {
      foodPurchaseApplicationId: null,
      reversed: false,
    }
  }

  if (
    typeof prisma.foodPurchaseApplication?.findFirst !== "function" ||
    typeof prisma.foodPurchaseApplication?.update !== "function"
  ) {
    throw new Error(
      "Opening Food Purchase reversal requires the latest Prisma migration and generated client."
    )
  }

  const application = await prisma.foodPurchaseApplication.findFirst({
    where: {
      id: foodPurchaseApplicationId,
      memberId: input.openingBalance.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!application) {
    throw ExpectedQueryError.notFound(
      "Linked opening Food Purchase obligation was not found."
    )
  }

  if (Number(application.paidAmount ?? 0) > 0) {
    throw ExpectedQueryError.conflict(
      "Opening balance reversal cannot cancel a Food Purchase obligation that already has repayment activity."
    )
  }

  await prisma.foodPurchaseApplication.update({
    data: {
      reviewNotes: `Reversed from opening balance: ${input.reversalNotes}`,
      status: "cancelled",
    },
    where: {
      id: foodPurchaseApplicationId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.food_purchase_reversed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: foodPurchaseApplicationId,
      entityType: "FoodPurchaseApplication",
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
    foodPurchaseApplicationId,
    reversed: true,
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
    throw ExpectedQueryError.notFound(
      "Linked opening procurement obligation was not found."
    )
  }

  const scheduleItems = request.repaymentScheduleItems ?? []
  const paidAmount = scheduleItems.reduce(
    (sum: number, item: any) => sum + Number(item.paidAmount ?? 0),
    0
  )

  if (paidAmount > 0) {
    throw ExpectedQueryError.conflict(
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
    input.activeFinancingInstallmentAmount ?? 0,
    "Active financing installment amount"
  )
  assertNonNegativeAmount(
    input.procurementOutstanding ?? 0,
    "Procurement outstanding"
  )
  assertNonNegativeAmount(
    input.procurementInstallmentAmount ?? 0,
    "Procurement installment amount"
  )
  assertNonNegativeAmount(
    input.foodPurchaseOutstanding ?? 0,
    "Food Purchase outstanding"
  )
  assertNonNegativeAmount(
    input.foodPurchaseInstallmentAmount ?? 0,
    "Food Purchase installment amount"
  )
  validateOpeningObligationPlan({
    installmentsPaid: input.activeFinancingInstallmentsPaid,
    label: "Active financing",
    originalAmount: input.activeFinancingOriginalAmount,
    outstandingAmount: input.activeFinancingOutstanding,
    repaymentMonths: input.activeFinancingRepaymentMonths,
  })
  validateOpeningObligationPlan({
    installmentsPaid: input.procurementInstallmentsPaid,
    label: "Procurement",
    originalAmount: input.procurementOriginalAmount,
    outstandingAmount: input.procurementOutstanding,
    repaymentMonths: input.procurementRepaymentMonths,
  })
  validateOpeningObligationPlan({
    installmentsPaid: input.foodPurchaseInstallmentsPaid,
    label: "Food Purchase",
    originalAmount: input.foodPurchaseOriginalAmount,
    outstandingAmount: input.foodPurchaseOutstanding,
    repaymentMonths: input.foodPurchaseRepaymentMonths,
  })

  if (
    input.shareUnits != null &&
    (!Number.isInteger(input.shareUnits) || input.shareUnits < 0)
  ) {
    throw ExpectedQueryError.validation(
      "Share units must be a whole number 0 or greater."
    )
  }

  if (
    input.activeFinancingGuarantorOneMemberId &&
    input.activeFinancingGuarantorTwoMemberId &&
    input.activeFinancingGuarantorOneMemberId ===
      input.activeFinancingGuarantorTwoMemberId
  ) {
    throw ExpectedQueryError.validation(
      "Opening financing guarantors must be different members."
    )
  }
}

function buildOpeningBalanceMutationData(
  input: MemberOpeningBalanceInput & {
    actorUserId: string
  },
  openingDate: Date
) {
  return {
    activeFinancingOutstanding: input.activeFinancingOutstanding ?? 0,
    activeFinancingOriginalAmount: input.activeFinancingOriginalAmount ?? 0,
    activeFinancingGuarantorOneMemberId:
      input.activeFinancingGuarantorOneMemberId?.trim() || null,
    activeFinancingGuarantorTwoMemberId:
      input.activeFinancingGuarantorTwoMemberId?.trim() || null,
    activeFinancingInstallmentAmount:
      input.activeFinancingInstallmentAmount ?? 0,
    activeFinancingInstallmentsPaid:
      input.activeFinancingInstallmentsPaid ?? null,
    activeFinancingOpenedAt: input.activeFinancingOpenedAt
      ? startOfDay(input.activeFinancingOpenedAt)
      : null,
    activeFinancingRepaymentMonths:
      input.activeFinancingRepaymentMonths ?? null,
    commitmentSavingsBalance: input.commitmentSavingsBalance ?? 0,
    foodPurchaseOutstanding: input.foodPurchaseOutstanding ?? 0,
    foodPurchaseInstallmentAmount: input.foodPurchaseInstallmentAmount ?? 0,
    foodPurchaseInstallmentsPaid: input.foodPurchaseInstallmentsPaid ?? null,
    foodPurchaseItemName: input.foodPurchaseItemName?.trim() || null,
    foodPurchaseOpenedAt: input.foodPurchaseOpenedAt
      ? startOfDay(input.foodPurchaseOpenedAt)
      : null,
    foodPurchaseOriginalAmount: input.foodPurchaseOriginalAmount ?? 0,
    foodPurchaseRepaymentMonths: input.foodPurchaseRepaymentMonths ?? null,
    notes: input.notes?.trim() || null,
    openingDate,
    procurementOutstanding: input.procurementOutstanding ?? 0,
    procurementInstallmentAmount: input.procurementInstallmentAmount ?? 0,
    procurementInstallmentsPaid: input.procurementInstallmentsPaid ?? null,
    procurementItemName: input.procurementItemName?.trim() || null,
    procurementOpenedAt: input.procurementOpenedAt
      ? startOfDay(input.procurementOpenedAt)
      : null,
    procurementOriginalAmount: input.procurementOriginalAmount ?? 0,
    procurementRepaymentMonths: input.procurementRepaymentMonths ?? null,
    shareCapitalBalance: input.shareCapitalBalance ?? 0,
    shareUnits: input.shareUnits ?? null,
    sourceDocumentName: input.sourceDocumentName?.trim() || null,
    sourceDocumentUrl: input.sourceDocumentUrl?.trim() || null,
    specialSavingsBalance: input.specialSavingsBalance ?? 0,
  }
}

function buildOpeningBalanceAuditMetadata(
  input: MemberOpeningBalanceInput,
  openingDate: Date
) {
  return {
    activeFinancingOutstanding: input.activeFinancingOutstanding ?? 0,
    activeFinancingOriginalAmount: input.activeFinancingOriginalAmount ?? 0,
    activeFinancingGuarantorOneMemberId:
      input.activeFinancingGuarantorOneMemberId?.trim() || null,
    activeFinancingGuarantorTwoMemberId:
      input.activeFinancingGuarantorTwoMemberId?.trim() || null,
    activeFinancingInstallmentAmount:
      input.activeFinancingInstallmentAmount ?? 0,
    activeFinancingInstallmentsPaid:
      input.activeFinancingInstallmentsPaid ?? null,
    activeFinancingOpenedAt: input.activeFinancingOpenedAt
      ? startOfDay(input.activeFinancingOpenedAt).toISOString()
      : null,
    activeFinancingRepaymentMonths:
      input.activeFinancingRepaymentMonths ?? null,
    commitmentSavingsBalance: input.commitmentSavingsBalance ?? 0,
    foodPurchaseOutstanding: input.foodPurchaseOutstanding ?? 0,
    foodPurchaseInstallmentAmount: input.foodPurchaseInstallmentAmount ?? 0,
    foodPurchaseInstallmentsPaid: input.foodPurchaseInstallmentsPaid ?? null,
    foodPurchaseItemName: input.foodPurchaseItemName?.trim() || null,
    foodPurchaseOpenedAt: input.foodPurchaseOpenedAt
      ? startOfDay(input.foodPurchaseOpenedAt).toISOString()
      : null,
    foodPurchaseOriginalAmount: input.foodPurchaseOriginalAmount ?? 0,
    foodPurchaseRepaymentMonths: input.foodPurchaseRepaymentMonths ?? null,
    hasSourceDocument: Boolean(input.sourceDocumentUrl),
    memberId: input.memberId,
    openingDate: openingDate.toISOString(),
    procurementOutstanding: input.procurementOutstanding ?? 0,
    procurementInstallmentAmount: input.procurementInstallmentAmount ?? 0,
    procurementInstallmentsPaid: input.procurementInstallmentsPaid ?? null,
    procurementItemName: input.procurementItemName?.trim() || null,
    procurementOpenedAt: input.procurementOpenedAt
      ? startOfDay(input.procurementOpenedAt).toISOString()
      : null,
    procurementOriginalAmount: input.procurementOriginalAmount ?? 0,
    procurementRepaymentMonths: input.procurementRepaymentMonths ?? null,
    shareCapitalBalance: input.shareCapitalBalance ?? 0,
    shareUnits: input.shareUnits ?? null,
    specialSavingsBalance: input.specialSavingsBalance ?? 0,
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
    throw ExpectedQueryError.permission(
      "Opening balance actor does not belong to this tenant."
    )
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
    throw ExpectedQueryError.permission(
      "Opening balance member does not belong to this tenant."
    )
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
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.conflict(
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
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.validation(
      "Opening balance status is not supported."
    )
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
  const mutationData = buildOpeningBalanceMutationData(input, openingDate)
  const auditMetadata = buildOpeningBalanceAuditMetadata(input, openingDate)

  const existing = await prisma.memberOpeningBalance.findFirst({
    where: {
      memberId: input.memberId,
      openingDate,
      tenantId: input.tenantId,
    },
  })

  if (existing) {
    if (
      !["pending_review", "rejected", "cancelled"].includes(existing.status)
    ) {
      throw ExpectedQueryError.conflict(
        "An opening position already exists for this member and date. Review or reverse the existing position before staging another one."
      )
    }

    const updated = await prisma.memberOpeningBalance.update({
      data: {
        ...mutationData,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNotes: null,
        status: "pending_review",
      },
      include: openingBalanceInclude(),
      where: { id: existing.id },
    })

    await createAuditLogEntry(
      {
        action: "migration.opening_balance.updated",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: updated.id,
        entityType: "MemberOpeningBalance",
        metadata: auditMetadata,
        tenantId: input.tenantId,
      },
      prisma
    )

    return normalizeOpeningBalance(updated)
  }

  let created

  try {
    created = await prisma.memberOpeningBalance.create({
      data: {
        ...mutationData,
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        tenantId: input.tenantId,
      },
      include: openingBalanceInclude(),
    })
  } catch (error) {
    if ((error as { code?: unknown }).code === "P2002") {
      throw ExpectedQueryError.conflict(
        "An opening position already exists for this member and date. Refresh the page and edit the existing staged position."
      )
    }

    throw error
  }

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: created.id,
      entityType: "MemberOpeningBalance",
      metadata: auditMetadata,
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
    throw ExpectedQueryError.validation(
      "Opening balance review must be approved or rejected."
    )
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
    throw ExpectedQueryError.notFound("Opening balance was not found.")
  }

  await assertOpeningBalanceMutationOpen(
    {
      memberId: existing.memberId,
      tenantId: input.tenantId,
    },
    prisma
  )

  if (existing.status !== "pending_review") {
    throw ExpectedQueryError.conflict(
      "Only pending opening balances can be reviewed."
    )
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

export async function cancelMemberOpeningBalance(
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

  const existing = await prisma.memberOpeningBalance.findFirst({
    include: openingBalanceInclude(),
    where: {
      id: input.openingBalanceId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw ExpectedQueryError.notFound("Opening balance was not found.")
  }

  await assertOpeningBalanceMutationOpen(
    {
      memberId: existing.memberId,
      tenantId: input.tenantId,
    },
    prisma
  )

  if (existing.status !== "pending_review") {
    throw ExpectedQueryError.conflict(
      "Only pending opening balances can be cancelled."
    )
  }

  const updated = await prisma.memberOpeningBalance.update({
    data: {
      status: "cancelled",
    },
    include: openingBalanceInclude(),
    where: {
      id: input.openingBalanceId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.opening_balance.cancelled",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.openingBalanceId,
      entityType: "MemberOpeningBalance",
      metadata: {
        memberId: existing.memberId,
        nextStatus: "cancelled",
        previousStatus: existing.status,
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

  const runApplyTransaction = (
    operation: (tx: any) => Promise<MemberOpeningBalanceRow>
  ) =>
    prisma.$transaction(operation, {
      maxWait: 10_000,
      timeout: 30_000,
    })

  return runApplyTransaction(async (tx: any) => {
    const existing = await tx.memberOpeningBalance.findFirst({
      include: openingBalanceInclude(),
      where: {
        id: input.openingBalanceId,
        tenantId: input.tenantId,
      },
    })

    if (!existing) {
      throw ExpectedQueryError.notFound("Opening balance was not found.")
    }

    await assertOpeningBalanceMutationOpen(
      {
        memberId: existing.memberId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (existing.status !== "approved") {
      throw ExpectedQueryError.conflict(
        "Only approved opening balances can be applied."
      )
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
      throw ExpectedQueryError.conflict(
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
    const foodPurchaseOutstanding = Number(
      existing.foodPurchaseOutstanding ?? 0
    )
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

    const foodPurchasePosting = await createOpeningFoodPurchaseObligation(
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
        ...(foodPurchasePosting.foodPurchaseApplicationId
          ? {
              appliedFoodPurchaseApplicationId:
                foodPurchasePosting.foodPurchaseApplicationId,
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
          foodPurchaseApplicationId:
            foodPurchasePosting.foodPurchaseApplicationId,
          foodPurchaseCycleId: foodPurchasePosting.cycleId,
          foodPurchaseOutstanding,
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
    throw ExpectedQueryError.validation(
      "Opening balance reversal notes are required."
    )
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
      throw ExpectedQueryError.notFound("Opening balance was not found.")
    }

    await assertOpeningBalanceCorrectionOpen(input.tenantId, tx)

    if (existing.status !== "applied") {
      throw ExpectedQueryError.conflict(
        "Only applied opening balances can be reversed."
      )
    }

    const commitmentSavingsBalance = Number(
      existing.commitmentSavingsBalance ?? 0
    )
    const specialSavingsBalance = Number(existing.specialSavingsBalance ?? 0)
    const savingsTotal = commitmentSavingsBalance + specialSavingsBalance
    const shareCapitalBalance = Number(existing.shareCapitalBalance ?? 0)
    const foodPurchaseOutstanding = Number(
      existing.foodPurchaseOutstanding ?? 0
    )
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

    const foodPurchaseReversal = await reverseOpeningFoodPurchaseObligation(
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
        throw ExpectedQueryError.permission(
          "Opening balance member does not belong to this tenant."
        )
      }

      if (Number(member.totalSavingsSnapshot ?? 0) < savingsTotal) {
        throw ExpectedQueryError.precondition(
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
          foodPurchaseApplicationId:
            foodPurchaseReversal.foodPurchaseApplicationId,
          foodPurchaseOutstanding,
          foodPurchaseReversed: foodPurchaseReversal.reversed,
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
