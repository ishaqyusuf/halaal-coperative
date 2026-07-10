import type {
  ContributionChannel,
  MemberPaymentReceiptAllocationCategory,
  MemberPaymentReceiptPeriodIntent,
  MemberPaymentReceiptStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { recordMemberPaymentMutation } from "./contributions"
import { getTenantInitialMigrationState } from "./migration"
import { createMemberShareLedgerEntry } from "./tenant-finance"

export type PaymentReceiptAllocationInput = {
  amount: number
  category: MemberPaymentReceiptAllocationCategory
  contributionPlanId?: string | null
  foodPurchaseApplicationId?: string | null
  loanId?: string | null
  notes?: string | null
  periodIntent?: MemberPaymentReceiptPeriodIntent | null
  projectFinancingRequestId?: string | null
  procurementRepaymentScheduleItemId?: string | null
  targetPeriodStart?: Date | null
}

export type MemberPaymentReceiptAllocationRow = {
  amount: number
  category: MemberPaymentReceiptAllocationCategory
  contributionPlanId: string | null
  foodPurchaseApplicationId: string | null
  id: string
  loanId: string | null
  notes: string | null
  periodIntent: MemberPaymentReceiptPeriodIntent
  postedContributionId: string | null
  postedRepaymentId: string | null
  postedShareLedgerEntryId: string | null
  projectFinancingRequestId: string | null
  procurementRepaymentScheduleItemId: string | null
  targetPeriodStart: Date | null
}

export type MemberPaymentReceiptRow = {
  allocations: MemberPaymentReceiptAllocationRow[]
  channel: ContributionChannel
  createdAt: Date
  id: string
  member: {
    email: string | null
    fullName: string
    id: string
    memberNumber: string
  }
  memberId: string
  memberNotes: string | null
  paidAt: Date
  paymentReference: string | null
  proofDocumentName: string | null
  proofDocumentUrl: string | null
  reviewedAt: Date | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  status: MemberPaymentReceiptStatus
  submittedAt: Date
  submittedByUserId: string | null
  totalAmount: number
  updatedAt: Date
}

export type MemberPaymentReceiptSummary = {
  approvedReceipts: number
  correctionRequestedReceipts: number
  pendingReviewReceipts: number
  rejectedReceipts: number
  submittedReceipts: number
  underReviewReceipts: number
}

const receiptStatuses = new Set<MemberPaymentReceiptStatus>([
  "approved",
  "correction_requested",
  "rejected",
  "submitted",
  "under_review",
])

const allocationCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "commitment",
  "food_purchase",
  "loan_extra_payment",
  "loan_servicing",
  "other",
  "procurement",
  "project_financing",
  "shares",
  "special_savings",
])

const periodIntents = new Set<MemberPaymentReceiptPeriodIntent>([
  "back_period",
  "current_period",
  "future_period",
  "unspecified",
])

const postableCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "commitment",
  "food_purchase",
  "loan_extra_payment",
  "loan_servicing",
  "procurement",
  "project_financing",
  "shares",
  "special_savings",
])

const loanCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "loan_extra_payment",
  "loan_servicing",
])

const contributionCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "commitment",
  "special_savings",
])

const shareCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "shares",
])

const procurementCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "procurement",
])

const projectFinancingCategories =
  new Set<MemberPaymentReceiptAllocationCategory>(["project_financing"])

const foodPurchaseCategories = new Set<MemberPaymentReceiptAllocationCategory>([
  "food_purchase",
])

const payableProcurementScheduleStatuses = [
  "due",
  "overdue",
  "partially_paid",
  "pending",
] as const

function assertReceiptStatus(value: MemberPaymentReceiptStatus) {
  if (!receiptStatuses.has(value)) {
    throw new Error("Unsupported receipt status.")
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0.`)
  }

  return Math.round(value * 100) / 100
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function moneyEquals(left: number, right: number) {
  return Math.abs(left - right) <= 0.005
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

function normalizeAllocationInput(
  allocation: PaymentReceiptAllocationInput,
  index: number
) {
  if (!allocationCategories.has(allocation.category)) {
    throw new Error(`Allocation ${index + 1} has an unsupported category.`)
  }

  const periodIntent = allocation.periodIntent ?? "unspecified"
  if (!periodIntents.has(periodIntent)) {
    throw new Error(`Allocation ${index + 1} has an unsupported period intent.`)
  }

  if (loanCategories.has(allocation.category) && !allocation.loanId) {
    throw new Error(
      `Allocation ${index + 1} needs a loan before it can be posted.`
    )
  }

  const procurementRepaymentScheduleItemId = normalizeOptionalString(
    allocation.procurementRepaymentScheduleItemId
  )
  const foodPurchaseApplicationId = normalizeOptionalString(
    allocation.foodPurchaseApplicationId
  )
  const projectFinancingRequestId = normalizeOptionalString(
    allocation.projectFinancingRequestId
  )

  if (
    procurementCategories.has(allocation.category) &&
    !procurementRepaymentScheduleItemId
  ) {
    throw new Error(
      `Allocation ${index + 1} needs a procurement schedule item before it can be posted.`
    )
  }

  if (
    foodPurchaseCategories.has(allocation.category) &&
    !foodPurchaseApplicationId
  ) {
    throw new Error(
      `Allocation ${index + 1} needs a Foodstuff Purchase application before it can be posted.`
    )
  }

  if (
    projectFinancingCategories.has(allocation.category) &&
    !projectFinancingRequestId
  ) {
    throw new Error(
      `Allocation ${index + 1} needs a project financing request before it can be posted.`
    )
  }

  return {
    amount: normalizeAmount(
      allocation.amount,
      `Allocation ${index + 1} amount`
    ),
    category: allocation.category,
    contributionPlanId: normalizeOptionalString(allocation.contributionPlanId),
    foodPurchaseApplicationId,
    loanId: normalizeOptionalString(allocation.loanId),
    notes: normalizeOptionalString(allocation.notes),
    periodIntent,
    projectFinancingRequestId,
    procurementRepaymentScheduleItemId,
    targetPeriodStart: allocation.targetPeriodStart ?? null,
  }
}

function normalizeAllocations(
  allocations: PaymentReceiptAllocationInput[],
  totalAmount: number
) {
  if (!allocations.length) {
    throw new Error("At least one payment allocation is required.")
  }

  const normalized = allocations.map(normalizeAllocationInput)
  const allocationTotal = normalized.reduce(
    (sum, allocation) => sum + allocation.amount,
    0
  )

  if (!moneyEquals(allocationTotal, totalAmount)) {
    throw new Error("Receipt allocation total must match the receipt amount.")
  }

  return normalized
}

function normalizeReceipt(row: any): MemberPaymentReceiptRow {
  return {
    allocations: (row.allocations ?? []).map((allocation: any) => ({
      amount: Number(allocation.amount),
      category: allocation.category,
      contributionPlanId: allocation.contributionPlanId ?? null,
      foodPurchaseApplicationId: allocation.foodPurchaseApplicationId ?? null,
      id: allocation.id,
      loanId: allocation.loanId ?? null,
      notes: allocation.notes ?? null,
      periodIntent: allocation.periodIntent,
      postedContributionId: allocation.postedContributionId ?? null,
      postedRepaymentId: allocation.postedRepaymentId ?? null,
      postedShareLedgerEntryId: allocation.postedShareLedgerEntryId ?? null,
      projectFinancingRequestId: allocation.projectFinancingRequestId ?? null,
      procurementRepaymentScheduleItemId:
        allocation.procurementRepaymentScheduleItemId ?? null,
      targetPeriodStart: allocation.targetPeriodStart ?? null,
    })),
    channel: row.channel,
    createdAt: row.createdAt,
    id: row.id,
    member: {
      email: row.member?.email ?? null,
      fullName: row.member?.fullName ?? "Unknown member",
      id: row.member?.id ?? row.memberId,
      memberNumber: row.member?.memberNumber ?? "",
    },
    memberId: row.memberId,
    memberNotes: row.memberNotes ?? null,
    paidAt: row.paidAt,
    paymentReference: row.paymentReference ?? null,
    proofDocumentName: row.proofDocumentName ?? null,
    proofDocumentUrl: row.proofDocumentUrl ?? null,
    reviewedAt: row.reviewedAt ?? null,
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewNotes: row.reviewNotes ?? null,
    status: row.status,
    submittedAt: row.submittedAt,
    submittedByUserId: row.submittedByUserId ?? null,
    totalAmount: Number(row.totalAmount),
    updatedAt: row.updatedAt,
  }
}

function receiptInclude() {
  return {
    allocations: {
      orderBy: [
        { targetPeriodStart: "asc" as const },
        { createdAt: "asc" as const },
      ],
    },
    member: {
      select: {
        email: true,
        fullName: true,
        id: true,
        memberNumber: true,
      },
    },
  }
}

function periodLabel(
  targetPeriodStart: Date | null,
  periodIntent: MemberPaymentReceiptPeriodIntent
) {
  if (!targetPeriodStart) {
    return undefined
  }

  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(targetPeriodStart)

  if (periodIntent === "future_period") return `${label} (future)`
  if (periodIntent === "back_period") return `${label} (back payment)`
  if (periodIntent === "current_period") return `${label} (current)`

  return label
}

function allocationComparable(
  allocations: Array<ReturnType<typeof normalizeAllocationInput>>
) {
  return JSON.stringify(
    allocations
      .map((allocation) => ({
        amount: allocation.amount,
        category: allocation.category,
        contributionPlanId: allocation.contributionPlanId,
        foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
        loanId: allocation.loanId,
        notes: allocation.notes,
        periodIntent: allocation.periodIntent,
        projectFinancingRequestId: allocation.projectFinancingRequestId,
        procurementRepaymentScheduleItemId:
          allocation.procurementRepaymentScheduleItemId,
        targetPeriodStart:
          allocation.targetPeriodStart?.toISOString().slice(0, 10) ?? null,
      }))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right))
      )
  )
}

async function validateAllocationReferences(input: {
  allocations: Array<ReturnType<typeof normalizeAllocationInput>>
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  const contributionPlanIds = Array.from(
    new Set(
      input.allocations
        .map((allocation) => allocation.contributionPlanId)
        .filter((value): value is string => Boolean(value))
    )
  )
  const loanIds = Array.from(
    new Set(
      input.allocations
        .map((allocation) => allocation.loanId)
        .filter((value): value is string => Boolean(value))
    )
  )
  const procurementRepaymentScheduleItemIds = Array.from(
    new Set(
      input.allocations
        .map((allocation) => allocation.procurementRepaymentScheduleItemId)
        .filter((value): value is string => Boolean(value))
    )
  )
  const foodPurchaseApplicationIds = Array.from(
    new Set(
      input.allocations
        .map((allocation) => allocation.foodPurchaseApplicationId)
        .filter((value): value is string => Boolean(value))
    )
  )
  const projectFinancingRequestIds = Array.from(
    new Set(
      input.allocations
        .map((allocation) => allocation.projectFinancingRequestId)
        .filter((value): value is string => Boolean(value))
    )
  )

  if (contributionPlanIds.length) {
    const count = await input.prisma.contributionPlan.count({
      where: {
        id: { in: contributionPlanIds },
        memberId: input.memberId,
        tenantId: input.tenantId,
      },
    })

    if (count !== contributionPlanIds.length) {
      throw new Error(
        "One or more contribution plans do not belong to this member."
      )
    }
  }

  if (loanIds.length) {
    const count = await input.prisma.loan.count({
      where: {
        id: { in: loanIds },
        memberId: input.memberId,
        tenantId: input.tenantId,
        status: { in: ["approved", "disbursed", "active"] },
      },
    })

    if (count !== loanIds.length) {
      throw new Error(
        "One or more loans do not belong to this member or are not serviceable."
      )
    }
  }

  if (procurementRepaymentScheduleItemIds.length) {
    const count = await input.prisma.procurementRepaymentScheduleItem.count({
      where: {
        id: { in: procurementRepaymentScheduleItemIds },
        memberId: input.memberId,
        status: { in: [...payableProcurementScheduleStatuses] },
        tenantId: input.tenantId,
      },
    })

    if (count !== procurementRepaymentScheduleItemIds.length) {
      throw new Error(
        "One or more procurement schedule items do not belong to this member or are not payable."
      )
    }
  }

  if (foodPurchaseApplicationIds.length) {
    const count = await input.prisma.foodPurchaseApplication.count({
      where: {
        id: { in: foodPurchaseApplicationIds },
        memberId: input.memberId,
        status: "approved",
        tenantId: input.tenantId,
      },
    })

    if (count !== foodPurchaseApplicationIds.length) {
      throw new Error(
        "One or more Foodstuff Purchase applications do not belong to this member or are not approved."
      )
    }
  }

  if (projectFinancingRequestIds.length) {
    const count = await input.prisma.projectFinancingRequest.count({
      where: {
        approvedStructure: "repayable_facility",
        id: { in: projectFinancingRequestIds },
        memberId: input.memberId,
        status: { in: ["approved", "active"] },
        tenantId: input.tenantId,
      },
    })

    if (count !== projectFinancingRequestIds.length) {
      throw new Error(
        "One or more project financing requests do not belong to this member or are not payable repayable facilities."
      )
    }
  }
}

async function findActiveContributionPlan(input: {
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  return input.prisma.contributionPlan.findFirst({
    orderBy: { startsAt: "desc" },
    select: { id: true },
    where: {
      isActive: true,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })
}

async function replaceAllocations(input: {
  allocations: Array<ReturnType<typeof normalizeAllocationInput>>
  memberId: string
  receiptId: string
  tenantId: string
  tx: PrismaClient
}) {
  await input.tx.memberPaymentReceiptAllocation.deleteMany({
    where: {
      receiptId: input.receiptId,
      tenantId: input.tenantId,
    },
  })

  await input.tx.memberPaymentReceiptAllocation.createMany({
    data: input.allocations.map((allocation) => ({
      amount: allocation.amount,
      category: allocation.category,
      contributionPlanId: allocation.contributionPlanId,
      foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
      loanId: allocation.loanId,
      memberId: input.memberId,
      notes: allocation.notes,
      periodIntent: allocation.periodIntent,
      projectFinancingRequestId: allocation.projectFinancingRequestId,
      procurementRepaymentScheduleItemId:
        allocation.procurementRepaymentScheduleItemId,
      receiptId: input.receiptId,
      targetPeriodStart: allocation.targetPeriodStart,
      tenantId: input.tenantId,
    })),
  })
}

async function approveReceiptAllocations(input: {
  actorUserId: string
  allocations: MemberPaymentReceiptAllocationRow[]
  channel: ContributionChannel
  memberId: string
  paidAt: Date
  paymentReference: string | null
  tenantId: string
  tx: PrismaClient
}) {
  const unsupportedCategories = input.allocations.filter(
    (allocation) => !postableCategories.has(allocation.category)
  )

  if (unsupportedCategories.length) {
    const labels = Array.from(
      new Set(unsupportedCategories.map((allocation) => allocation.category))
    ).join(", ")

    throw new Error(
      `These receipt categories are staged but not yet postable: ${labels}. Request correction or wait for that product ledger.`
    )
  }

  const activePlan = await findActiveContributionPlan({
    memberId: input.memberId,
    prisma: input.tx,
    tenantId: input.tenantId,
  })

  const contributionGroups = new Map<
    string,
    MemberPaymentReceiptAllocationRow[]
  >()
  const loanGroups = new Map<string, MemberPaymentReceiptAllocationRow[]>()
  const foodPurchaseAllocations: MemberPaymentReceiptAllocationRow[] = []
  const projectFinancingAllocations: MemberPaymentReceiptAllocationRow[] = []
  const procurementAllocations: MemberPaymentReceiptAllocationRow[] = []
  const shareAllocations: MemberPaymentReceiptAllocationRow[] = []

  for (const allocation of input.allocations) {
    const periodKey =
      allocation.targetPeriodStart?.toISOString().slice(0, 10) ?? "none"
    const planKey = allocation.contributionPlanId ?? activePlan?.id ?? "none"
    const loanKey = allocation.loanId ?? "none"

    if (contributionCategories.has(allocation.category)) {
      const key = `${periodKey}:${planKey}`
      contributionGroups.set(key, [
        ...(contributionGroups.get(key) ?? []),
        allocation,
      ])
    }

    if (loanCategories.has(allocation.category)) {
      const key = `${periodKey}:${loanKey}`
      loanGroups.set(key, [...(loanGroups.get(key) ?? []), allocation])
    }

    if (shareCategories.has(allocation.category)) {
      shareAllocations.push(allocation)
    }

    if (procurementCategories.has(allocation.category)) {
      procurementAllocations.push(allocation)
    }

    if (foodPurchaseCategories.has(allocation.category)) {
      foodPurchaseAllocations.push(allocation)
    }

    if (projectFinancingCategories.has(allocation.category)) {
      projectFinancingAllocations.push(allocation)
    }
  }

  for (const group of contributionGroups.values()) {
    const first = group[0]
    if (!first) continue

    const committedSavingsAmount = group
      .filter((allocation) => allocation.category === "commitment")
      .reduce((sum, allocation) => sum + allocation.amount, 0)
    const extraSavingsAmount = group
      .filter((allocation) => allocation.category === "special_savings")
      .reduce((sum, allocation) => sum + allocation.amount, 0)
    const totalAmount = committedSavingsAmount + extraSavingsAmount
    const contributionPlanId = first.contributionPlanId ?? activePlan?.id

    const result = await recordMemberPaymentMutation(
      {
        actorUserId: input.actorUserId,
        channel: input.channel,
        committedSavingsAmount,
        contributionPlanId,
        extraSavingsAmount,
        memberId: input.memberId,
        periodLabel: periodLabel(first.targetPeriodStart, first.periodIntent),
        postedAt: input.paidAt,
        reference: input.paymentReference ?? undefined,
        tenantId: input.tenantId,
        totalAmount,
      },
      input.tx
    )

    if (result.contributionId) {
      await input.tx.memberPaymentReceiptAllocation.updateMany({
        data: { postedContributionId: result.contributionId },
        where: { id: { in: group.map((allocation) => allocation.id) } },
      })
    }
  }

  for (const group of loanGroups.values()) {
    const first = group[0]
    if (!first) continue

    if (!first.loanId || first.loanId === "none") {
      throw new Error("Loan allocations need a selected loan before approval.")
    }

    const scheduledLoanServicingAmount = group
      .filter((allocation) => allocation.category === "loan_servicing")
      .reduce((sum, allocation) => sum + allocation.amount, 0)
    const extraLoanPaymentAmount = group
      .filter((allocation) => allocation.category === "loan_extra_payment")
      .reduce((sum, allocation) => sum + allocation.amount, 0)
    const totalAmount = scheduledLoanServicingAmount + extraLoanPaymentAmount

    const result = await recordMemberPaymentMutation(
      {
        actorUserId: input.actorUserId,
        channel: input.channel,
        committedSavingsAmount: 0,
        extraLoanPaymentAmount,
        loanId: first.loanId,
        memberId: input.memberId,
        periodLabel: periodLabel(first.targetPeriodStart, first.periodIntent),
        postedAt: input.paidAt,
        reference: input.paymentReference ?? undefined,
        scheduledLoanServicingAmount,
        tenantId: input.tenantId,
        totalAmount,
      },
      input.tx
    )

    if (result.repaymentId) {
      await input.tx.memberPaymentReceiptAllocation.updateMany({
        data: { postedRepaymentId: result.repaymentId },
        where: { id: { in: group.map((allocation) => allocation.id) } },
      })
    }
  }

  for (const allocation of shareAllocations) {
    const ledgerEntry = await createMemberShareLedgerEntry(
      {
        amount: allocation.amount,
        createdByUserId: input.actorUserId,
        effectiveDate: input.paidAt,
        memberId: input.memberId,
        notes: [
          input.paymentReference
            ? `Receipt ${input.paymentReference}`
            : "Approved member payment receipt",
          periodLabel(allocation.targetPeriodStart, allocation.periodIntent),
          allocation.notes,
        ]
          .filter(Boolean)
          .join(" - "),
        sourceId: allocation.id,
        sourceType: "payment_receipt",
        tenantId: input.tenantId,
      },
      input.tx
    )

    await input.tx.memberPaymentReceiptAllocation.updateMany({
      data: { postedShareLedgerEntryId: ledgerEntry.id },
      where: { id: allocation.id },
    })
  }

  for (const allocation of foodPurchaseAllocations) {
    if (!allocation.foodPurchaseApplicationId) {
      throw new Error(
        "Foodstuff Purchase allocations need a selected application before approval."
      )
    }

    const application = await input.tx.foodPurchaseApplication.findFirst({
      select: {
        approvedAmount: true,
        id: true,
        paidAmount: true,
      },
      where: {
        id: allocation.foodPurchaseApplicationId,
        memberId: input.memberId,
        status: "approved",
        tenantId: input.tenantId,
      },
    })

    if (!application) {
      throw new Error(
        "Foodstuff Purchase application was not found or is no longer payable."
      )
    }

    const approvedAmount = Number(application.approvedAmount ?? 0)
    const paidAmount = Number(application.paidAmount ?? 0)
    const remainingAmount = roundMoney(approvedAmount - paidAmount)

    if (approvedAmount <= 0 || remainingAmount <= 0) {
      throw new Error(
        "Foodstuff Purchase application has no payable approved amount."
      )
    }

    if (allocation.amount - remainingAmount > 0.005) {
      throw new Error(
        "Foodstuff Purchase allocation exceeds the remaining approved application amount."
      )
    }

    const nextPaidAmount = roundMoney(paidAmount + allocation.amount)

    await input.tx.foodPurchaseApplication.update({
      data: {
        paidAmount: nextPaidAmount,
        paidAt: moneyEquals(nextPaidAmount, approvedAmount)
          ? input.paidAt
          : null,
      },
      where: { id: application.id },
    })
  }

  for (const allocation of projectFinancingAllocations) {
    if (!allocation.projectFinancingRequestId) {
      throw new Error(
        "Project financing allocations need a selected request before approval."
      )
    }

    const request = await input.tx.projectFinancingRequest.findFirst({
      select: {
        approvedAmount: true,
        id: true,
        paidAmount: true,
      },
      where: {
        approvedStructure: "repayable_facility",
        id: allocation.projectFinancingRequestId,
        memberId: input.memberId,
        status: { in: ["approved", "active"] },
        tenantId: input.tenantId,
      },
    })

    if (!request) {
      throw new Error(
        "Project financing request was not found or is no longer payable."
      )
    }

    const approvedAmount = Number(request.approvedAmount ?? 0)
    const paidAmount = Number(request.paidAmount ?? 0)
    const remainingAmount = roundMoney(approvedAmount - paidAmount)

    if (approvedAmount <= 0 || remainingAmount <= 0) {
      throw new Error(
        "Project financing request has no payable approved amount."
      )
    }

    if (allocation.amount - remainingAmount > 0.005) {
      throw new Error(
        "Project financing allocation exceeds the remaining approved request amount."
      )
    }

    const nextPaidAmount = roundMoney(paidAmount + allocation.amount)
    const isCompleted = moneyEquals(nextPaidAmount, approvedAmount)

    await input.tx.projectFinancingRequest.update({
      data: {
        paidAmount: nextPaidAmount,
        paidAt: isCompleted ? input.paidAt : null,
        status: isCompleted ? "completed" : "active",
      },
      where: { id: request.id },
    })
  }

  const completedProcurementRequestIds = new Set<string>()

  for (const allocation of procurementAllocations) {
    if (!allocation.procurementRepaymentScheduleItemId) {
      throw new Error(
        "Procurement allocations need a selected schedule item before approval."
      )
    }

    const scheduleItem =
      await input.tx.procurementRepaymentScheduleItem.findFirst({
        select: {
          amount: true,
          id: true,
          paidAmount: true,
          procurementRequestId: true,
        },
        where: {
          id: allocation.procurementRepaymentScheduleItemId,
          memberId: input.memberId,
          status: { in: [...payableProcurementScheduleStatuses] },
          tenantId: input.tenantId,
        },
      })

    if (!scheduleItem) {
      throw new Error(
        "Procurement schedule item was not found or is no longer payable."
      )
    }

    const scheduleAmount = Number(scheduleItem.amount)
    const paidAmount = Number(scheduleItem.paidAmount ?? 0)
    const remainingAmount = roundMoney(scheduleAmount - paidAmount)

    if (allocation.amount - remainingAmount > 0.005) {
      throw new Error(
        "Procurement allocation exceeds the remaining schedule item amount."
      )
    }

    const nextPaidAmount = roundMoney(paidAmount + allocation.amount)
    const nextStatus = moneyEquals(nextPaidAmount, scheduleAmount)
      ? "paid"
      : "partially_paid"

    await input.tx.procurementRepaymentScheduleItem.update({
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus,
      },
      where: { id: scheduleItem.id },
    })

    if (nextStatus === "paid") {
      completedProcurementRequestIds.add(scheduleItem.procurementRequestId)
    }
  }

  for (const procurementRequestId of completedProcurementRequestIds) {
    const outstandingScheduleItems =
      await input.tx.procurementRepaymentScheduleItem.count({
        where: {
          procurementRequestId,
          status: { notIn: ["paid", "waived"] },
          tenantId: input.tenantId,
        },
      })

    if (outstandingScheduleItems === 0) {
      await input.tx.procurementRequest.updateMany({
        data: { status: "completed" },
        where: {
          id: procurementRequestId,
          status: "active",
          tenantId: input.tenantId,
        },
      })
    }
  }
}

export async function listMemberPaymentReceipts(
  tenantId: string,
  filters?: {
    limit?: number
    memberId?: string
    status?: MemberPaymentReceiptStatus
    submittedFrom?: Date
    submittedTo?: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  if (filters?.status) {
    assertReceiptStatus(filters.status)
  }

  const limit = filters?.limit ?? 100
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Receipt list limit must be a positive whole number.")
  }

  const rows = await prisma.memberPaymentReceipt.findMany({
    include: receiptInclude(),
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    where: {
      tenantId,
      ...(filters?.memberId ? { memberId: filters.memberId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...((filters?.submittedFrom || filters?.submittedTo) && {
        submittedAt: {
          ...(filters?.submittedFrom ? { gte: filters.submittedFrom } : {}),
          ...(filters?.submittedTo ? { lte: filters.submittedTo } : {}),
        },
      }),
    },
  })

  return rows.map(normalizeReceipt)
}

export async function getMemberPaymentReceiptSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MemberPaymentReceiptSummary> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    submittedReceipts,
    underReviewReceipts,
    correctionRequestedReceipts,
    approvedReceipts,
    rejectedReceipts,
  ] = await Promise.all([
    prisma.memberPaymentReceipt.count({
      where: { tenantId, status: "submitted" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId, status: "under_review" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId, status: "correction_requested" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId, status: "approved" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId, status: "rejected" },
    }),
  ])

  return {
    approvedReceipts,
    correctionRequestedReceipts,
    pendingReviewReceipts: submittedReceipts + underReviewReceipts,
    rejectedReceipts,
    submittedReceipts,
    underReviewReceipts,
  }
}

export async function getMemberScopedPaymentReceiptSummary(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberPaymentReceiptSummary> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const where = {
    memberId: input.memberId,
    tenantId: input.tenantId,
  }
  const [
    submittedReceipts,
    underReviewReceipts,
    correctionRequestedReceipts,
    approvedReceipts,
    rejectedReceipts,
  ] = await Promise.all([
    prisma.memberPaymentReceipt.count({
      where: { ...where, status: "submitted" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { ...where, status: "under_review" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { ...where, status: "correction_requested" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { ...where, status: "approved" },
    }),
    prisma.memberPaymentReceipt.count({
      where: { ...where, status: "rejected" },
    }),
  ])

  return {
    approvedReceipts,
    correctionRequestedReceipts,
    pendingReviewReceipts: submittedReceipts + underReviewReceipts,
    rejectedReceipts,
    submittedReceipts,
    underReviewReceipts,
  }
}

export async function createMemberPaymentReceipt(
  input: {
    allocations: PaymentReceiptAllocationInput[]
    channel?: ContributionChannel
    memberId: string
    memberNotes?: string | null
    paidAt: Date
    paymentReference?: string | null
    proofDocumentName?: string | null
    proofDocumentUrl?: string | null
    submittedByUserId?: string | null
    tenantId: string
    totalAmount: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const totalAmount = normalizeAmount(input.totalAmount, "Receipt amount")
  const allocations = normalizeAllocations(input.allocations, totalAmount)
  const paymentReference = normalizeOptionalString(input.paymentReference)
  const proofDocumentUrl = normalizeOptionalString(input.proofDocumentUrl)

  const member = await prisma.member.findFirst({
    select: { id: true },
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new Error("Member does not belong to this cooperative.")
  }

  if (input.submittedByUserId) {
    const user = await prisma.user.findFirst({
      select: { id: true },
      where: {
        id: input.submittedByUserId,
        tenantId: input.tenantId,
      },
    })

    if (!user) {
      throw new Error("Submitting user does not belong to this cooperative.")
    }
  }

  await validateAllocationReferences({
    allocations,
    memberId: input.memberId,
    prisma,
    tenantId: input.tenantId,
  })

  if (paymentReference) {
    const duplicate = await prisma.memberPaymentReceipt.findFirst({
      select: { id: true },
      where: {
        paymentReference,
        status: { not: "rejected" },
        tenantId: input.tenantId,
      },
    })

    if (duplicate) {
      throw new Error(
        "A non-rejected receipt already uses this payment reference."
      )
    }
  }

  if (proofDocumentUrl) {
    const duplicate = await prisma.memberPaymentReceipt.findFirst({
      select: { id: true },
      where: {
        proofDocumentUrl,
        status: { not: "rejected" },
        tenantId: input.tenantId,
      },
    })

    if (duplicate) {
      throw new Error(
        "A non-rejected receipt already uses this proof document."
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.memberPaymentReceipt.create({
      data: {
        channel: input.channel ?? "transfer",
        memberId: input.memberId,
        memberNotes: normalizeOptionalString(input.memberNotes),
        paidAt: input.paidAt,
        paymentReference,
        proofDocumentName: normalizeOptionalString(input.proofDocumentName),
        proofDocumentUrl,
        submittedByUserId: normalizeOptionalString(input.submittedByUserId),
        tenantId: input.tenantId,
        totalAmount,
        allocations: {
          create: allocations.map((allocation) => ({
            amount: allocation.amount,
            category: allocation.category,
            contributionPlanId: allocation.contributionPlanId,
            foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
            loanId: allocation.loanId,
            memberId: input.memberId,
            notes: allocation.notes,
            periodIntent: allocation.periodIntent,
            projectFinancingRequestId: allocation.projectFinancingRequestId,
            procurementRepaymentScheduleItemId:
              allocation.procurementRepaymentScheduleItemId,
            targetPeriodStart: allocation.targetPeriodStart,
            tenantId: input.tenantId,
          })),
        },
      },
      include: receiptInclude(),
    })

    await tx.auditLog.create({
      data: {
        action: "member_payment_receipt.submitted",
        actorType: input.submittedByUserId ? "user" : "system",
        actorUserId: normalizeOptionalString(input.submittedByUserId),
        entityId: receipt.id,
        entityType: "MemberPaymentReceipt",
        metadata: {
          allocationCategories: allocations.map(
            (allocation) => allocation.category
          ),
          memberId: input.memberId,
          paymentReference,
          totalAmount,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return normalizeReceipt(receipt)
  })
}

export async function reviewMemberPaymentReceipt(
  input: {
    actorUserId: string
    adjustedAllocations?: PaymentReceiptAllocationInput[]
    adjustmentReason?: string | null
    decision: MemberPaymentReceiptStatus
    receiptId: string
    reviewNotes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  assertReceiptStatus(input.decision)

  if (input.decision === "submitted") {
    throw new Error("Receipt reviews cannot move a receipt back to submitted.")
  }

  if (input.decision === "approved") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  const actor = await prisma.user.findFirst({
    select: { id: true },
    where: {
      id: input.actorUserId,
      tenantId: input.tenantId,
    },
  })

  if (!actor) {
    throw new Error("Reviewing user does not belong to this cooperative.")
  }

  const existing = await prisma.memberPaymentReceipt.findFirst({
    include: receiptInclude(),
    where: {
      id: input.receiptId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Receipt submission not found.")
  }

  if (existing.status === "approved" || existing.status === "rejected") {
    throw new Error("Approved or rejected receipts cannot be reviewed again.")
  }

  if (
    (input.decision === "rejected" ||
      input.decision === "correction_requested") &&
    !normalizeOptionalString(input.reviewNotes)
  ) {
    throw new Error(
      "Review notes are required for rejected or correction-requested receipts."
    )
  }

  const totalAmount = Number(existing.totalAmount)
  const nextAllocations = input.adjustedAllocations
    ? normalizeAllocations(input.adjustedAllocations, totalAmount)
    : existing.allocations.map((allocation) =>
        normalizeAllocationInput(
          {
            amount: Number(allocation.amount),
            category: allocation.category,
            contributionPlanId: allocation.contributionPlanId,
            foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
            loanId: allocation.loanId,
            notes: allocation.notes,
            periodIntent: allocation.periodIntent,
            projectFinancingRequestId: allocation.projectFinancingRequestId,
            procurementRepaymentScheduleItemId:
              allocation.procurementRepaymentScheduleItemId,
            targetPeriodStart: allocation.targetPeriodStart,
          },
          0
        )
      )
  const existingComparable = allocationComparable(
    existing.allocations.map((allocation) =>
      normalizeAllocationInput(
        {
          amount: Number(allocation.amount),
          category: allocation.category,
          contributionPlanId: allocation.contributionPlanId,
          foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
          loanId: allocation.loanId,
          notes: allocation.notes,
          periodIntent: allocation.periodIntent,
          projectFinancingRequestId: allocation.projectFinancingRequestId,
          procurementRepaymentScheduleItemId:
            allocation.procurementRepaymentScheduleItemId,
          targetPeriodStart: allocation.targetPeriodStart,
        },
        0
      )
    )
  )
  const nextComparable = allocationComparable(nextAllocations)
  const allocationsChanged = existingComparable !== nextComparable
  const adjustmentReason = normalizeOptionalString(input.adjustmentReason)

  if (allocationsChanged && !adjustmentReason) {
    throw new Error(
      "An adjustment reason is required when receipt allocations are changed."
    )
  }

  await validateAllocationReferences({
    allocations: nextAllocations,
    memberId: existing.memberId,
    prisma,
    tenantId: input.tenantId,
  })

  return prisma.$transaction(async (tx) => {
    if (allocationsChanged) {
      await replaceAllocations({
        allocations: nextAllocations,
        memberId: existing.memberId,
        receiptId: existing.id,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })
    }

    if (input.decision === "approved") {
      const allocationRows = await tx.memberPaymentReceiptAllocation.findMany({
        orderBy: [{ targetPeriodStart: "asc" }, { createdAt: "asc" }],
        where: {
          receiptId: existing.id,
          tenantId: input.tenantId,
        },
      })

      await approveReceiptAllocations({
        actorUserId: input.actorUserId,
        allocations: allocationRows.map((allocation) => ({
          amount: Number(allocation.amount),
          category: allocation.category,
          contributionPlanId: allocation.contributionPlanId,
          foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
          id: allocation.id,
          loanId: allocation.loanId,
          notes: allocation.notes,
          periodIntent: allocation.periodIntent,
          postedContributionId: allocation.postedContributionId,
          postedRepaymentId: allocation.postedRepaymentId,
          postedShareLedgerEntryId: allocation.postedShareLedgerEntryId,
          projectFinancingRequestId: allocation.projectFinancingRequestId,
          procurementRepaymentScheduleItemId:
            allocation.procurementRepaymentScheduleItemId,
          targetPeriodStart: allocation.targetPeriodStart,
        })),
        channel: existing.channel,
        memberId: existing.memberId,
        paidAt: existing.paidAt,
        paymentReference: existing.paymentReference,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })
    }

    const receipt = await tx.memberPaymentReceipt.update({
      data: {
        adjustmentReason,
        reviewedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        reviewNotes: normalizeOptionalString(input.reviewNotes),
        status: input.decision,
      },
      include: receiptInclude(),
      where: { id: existing.id },
    })

    await tx.auditLog.create({
      data: {
        action: `member_payment_receipt.${input.decision}`,
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: receipt.id,
        entityType: "MemberPaymentReceipt",
        metadata: {
          adjustmentReason,
          allocationsChanged,
          memberId: receipt.memberId,
          previousStatus: existing.status,
          reviewNotes: normalizeOptionalString(input.reviewNotes),
          totalAmount,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return normalizeReceipt(receipt)
  })
}
