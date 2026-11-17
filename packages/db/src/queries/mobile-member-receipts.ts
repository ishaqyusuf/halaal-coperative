import type {
  MemberPaymentReceiptAllocationCategory,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  createMemberPaymentReceipt,
  createMemberPaymentReceiptPageCursor,
  getMemberPaymentReceipt,
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceiptPage,
  listMemberPaymentReceiptPageWithoutTotal,
  type MemberPaymentReceiptRow,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import { getMemberByUserId } from "./members"
import {
  getTenantOperationProfile,
  resolveTenantServiceCapabilities,
} from "./operation-profile"
import { ExpectedQueryError } from "../query-error"

export type MobileReceiptTargetKind =
  | "contributionPlanId"
  | "foodPurchaseApplicationId"
  | "loanId"
  | "projectFinancingRequestId"
  | "procurementRepaymentScheduleItemId"
  | null

export type MobileReceiptCategoryOption = {
  label: string
  postable: boolean
  requiresTarget: boolean
  targetKind: MobileReceiptTargetKind
  targets: { id: string; label: string; outstandingAmount: number | null }[]
  value: MemberPaymentReceiptAllocationCategory
}

export type MobileMemberPaymentReceipt = ReturnType<typeof toMobileReceipt>

export type MobileMemberReceiptSnapshot = {
  canCreateReceipt: boolean
  canCreateSupportCase: boolean
  categories: MobileReceiptCategoryOption[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor: string | null
  receipts: MobileMemberPaymentReceipt[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    approvedReceipts: number
    correctionRequestedReceipts: number
    pendingReviewReceipts: number
    rejectedReceipts: number
  }
}

function toMobileReceipt(row: MemberPaymentReceiptRow) {
  return {
    allocations: row.allocations.map((allocation) => ({
      amount: allocation.amount,
      category: allocation.category,
      contributionPlanId: allocation.contributionPlanId,
      foodPurchaseApplicationId: allocation.foodPurchaseApplicationId,
      id: allocation.id,
      loanId: allocation.loanId,
      notes: allocation.notes,
      periodIntent: allocation.periodIntent,
      projectFinancingRequestId: allocation.projectFinancingRequestId,
      procurementRepaymentScheduleItemId:
        allocation.procurementRepaymentScheduleItemId,
      targetPeriodStart: allocation.targetPeriodStart?.toISOString() ?? null,
    })),
    channel: row.channel,
    id: row.id,
    memberNotes: row.memberNotes,
    paidAt: row.paidAt.toISOString(),
    paymentReference: row.paymentReference,
    proofDocumentName: row.proofDocumentName,
    proofDocumentUrl: row.proofDocumentUrl,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNotes: row.reviewNotes,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    totalAmount: row.totalAmount,
  }
}

function emptySnapshot(
  state: MobileMemberReceiptSnapshot["state"]
): MobileMemberReceiptSnapshot {
  return {
    canCreateReceipt: false,
    canCreateSupportCase: false,
    categories: [],
    generatedAt: new Date().toISOString(),
    member: null,
    nextCursor: null,
    receipts: [],
    state,
    summary: {
      approvedReceipts: 0,
      correctionRequestedReceipts: 0,
      pendingReviewReceipts: 0,
      rejectedReceipts: 0,
    },
  }
}

async function getReceiptServices(tenantId: string, prisma: PrismaClient) {
  const settings = await prisma.tenantServiceSetting.findMany({
    select: { accessMode: true, serviceKey: true },
    where: {
      tenantId,
      serviceKey: {
        in: [
          "payment_receipts",
          "support_cases",
          "procurement",
          "food_purchase",
        ],
      },
    },
  })
  return resolveTenantServiceCapabilities(
    Object.fromEntries(
      settings.map(({ serviceKey, accessMode }) => [serviceKey, accessMode])
    )
  )
}

async function getReceiptCategories(input: {
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  const { memberId, prisma, tenantId } = input
  const scope = { memberId, tenantId }
  const [services, plans, loans, procurement, foodPurchase, projectFinancing] =
    await Promise.all([
      getReceiptServices(tenantId, prisma),
      prisma.contributionPlan.findMany({
        where: { ...scope, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { amount: true, id: true },
      }),
      prisma.loan.findMany({
        where: {
          ...scope,
          status: { in: ["approved", "disbursed", "active"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          loanProduct: { select: { name: true } },
          outstandingPrincipal: true,
        },
      }),
      prisma.procurementRepaymentScheduleItem.findMany({
        where: {
          ...scope,
          status: { in: ["due", "overdue", "partially_paid", "pending"] },
          amount: {
            gt: prisma.procurementRepaymentScheduleItem.fields.paidAmount,
          },
          procurementRequest: scope,
        },
        orderBy: [{ dueDate: "asc" }, { id: "asc" }],
        take: 100,
        select: {
          amount: true,
          id: true,
          installmentNumber: true,
          paidAmount: true,
          procurementRequest: { select: { itemName: true } },
        },
      }),
      prisma.foodPurchaseApplication.findMany({
        where: {
          ...scope,
          status: "approved",
          approvedAmount: {
            gt: prisma.foodPurchaseApplication.fields.paidAmount,
          },
        },
        orderBy: { requestedAt: "desc" },
        take: 100,
        select: {
          approvedAmount: true,
          id: true,
          itemDescription: true,
          paidAmount: true,
        },
      }),
      prisma.projectFinancingRequest.findMany({
        where: {
          ...scope,
          approvedStructure: "repayable_facility",
          status: { in: ["approved", "active"] },
          approvedAmount: {
            gt: prisma.projectFinancingRequest.fields.paidAmount,
          },
        },
        orderBy: { requestedAt: "desc" },
        take: 100,
        select: {
          approvedAmount: true,
          businessName: true,
          id: true,
          paidAmount: true,
        },
      }),
    ])

  const planTargets = plans.map((plan) => ({
    id: plan.id,
    label: `${Number(plan.amount).toLocaleString("en-NG")} active commitment`,
    outstandingAmount: null,
  }))
  const loanTargets = loans.map((loan) => ({
    id: loan.id,
    label: loan.loanProduct.name,
    outstandingAmount: Number(loan.outstandingPrincipal),
  }))
  const procurementTargets = procurement.map((item) => ({
    id: item.id,
    label: `${item.procurementRequest.itemName} · Instalment ${item.installmentNumber}`,
    outstandingAmount: Number(item.amount) - Number(item.paidAmount),
  }))
  const foodTargets = foodPurchase.map((application) => ({
    id: application.id,
    label: application.itemDescription ?? "Foodstuff Purchase",
    outstandingAmount:
      Number(application.approvedAmount) - Number(application.paidAmount),
  }))
  const projectTargets = projectFinancing.map((request) => ({
    id: request.id,
    label: request.businessName,
    outstandingAmount:
      Number(request.approvedAmount) - Number(request.paidAmount),
  }))

  const options: MobileReceiptCategoryOption[] = [
    {
      label: "Commitment",
      postable: true,
      requiresTarget: false,
      targetKind: "contributionPlanId",
      targets: planTargets,
      value: "commitment",
    },
    {
      label: "Special savings",
      postable: true,
      requiresTarget: false,
      targetKind: "contributionPlanId",
      targets: planTargets,
      value: "special_savings",
    },
    {
      label: "Loan servicing",
      postable: true,
      requiresTarget: true,
      targetKind: "loanId",
      targets: loanTargets,
      value: "loan_servicing",
    },
    {
      label: "Extra loan payment",
      postable: true,
      requiresTarget: true,
      targetKind: "loanId",
      targets: loanTargets,
      value: "loan_extra_payment",
    },
    {
      label: "Shares",
      postable: true,
      requiresTarget: false,
      targetKind: null,
      targets: [],
      value: "shares",
    },
    {
      label: "Project financing",
      postable: true,
      requiresTarget: true,
      targetKind: "projectFinancingRequestId",
      targets: projectTargets,
      value: "project_financing",
    },
    {
      label: "Other",
      postable: false,
      requiresTarget: false,
      targetKind: null,
      targets: [],
      value: "other",
    },
  ]
  if (
    services.procurement.accessMode !== "disabled" ||
    procurementTargets.length > 0
  ) {
    options.splice(5, 0, {
      label: "Procurement",
      postable: true,
      requiresTarget: true,
      targetKind: "procurementRepaymentScheduleItemId",
      targets: procurementTargets,
      value: "procurement",
    })
  }
  if (
    services.food_purchase.accessMode !== "disabled" ||
    foodTargets.length > 0
  ) {
    options.splice(options.length - 1, 0, {
      label: "Foodstuff Purchase",
      postable: true,
      requiresTarget: true,
      targetKind: "foodPurchaseApplicationId",
      targets: foodTargets,
      value: "food_purchase",
    })
  }
  return {
    canCreateReceipt: services.payment_receipts.canMemberCreate,
    canCreateSupportCase: services.support_cases.canMemberCreate,
    options,
  }
}

export async function getMobileMemberReceiptFormOptions(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const member = await getMemberByUserId(input, prisma)
  if (!member) return { canCreateReceipt: false, categories: [] }
  const { canCreateReceipt, options } = await getReceiptCategories({
    memberId: member.id,
    prisma,
    tenantId: input.tenantId,
  })
  return { canCreateReceipt, categories: options }
}

export async function getMobileMemberReceiptSnapshot(
  input: {
    compact?: boolean
    cursor?: string | null
    search?: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileMemberReceiptSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")
  const { tenantId, cursor, compact, search } = input
  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")
  const scope = { memberId: member.id, tenantId }
  const pageSize = 20
  const sort = ["submittedAt", "desc"] as ["submittedAt", "desc"]
  const filters = { ...scope, cursor, pageSize: pageSize + 1, sort }
  const [summary, capabilities, items] = await Promise.all([
    compact && cursor
      ? emptySnapshot("available").summary
      : getMemberScopedPaymentReceiptSummary(scope, prisma),
    compact
      ? getReceiptServices(tenantId, prisma).then((services) => ({
          canCreateReceipt: services.payment_receipts.canMemberCreate,
          canCreateSupportCase: services.support_cases.canMemberCreate,
          options: [],
        }))
      : getReceiptCategories({ ...scope, prisma }),
    compact
      ? listMemberPaymentReceiptPageWithoutTotal(
          tenantId,
          { ...filters, memberLedgerSearch: search },
          prisma
        )
      : listMemberPaymentReceiptPage(tenantId, filters, prisma).then(
          (page) => page.items
        ),
  ])
  const rows = items.slice(0, pageSize)
  return {
    canCreateReceipt: capabilities.canCreateReceipt,
    canCreateSupportCase: capabilities.canCreateSupportCase,
    categories: capabilities.options,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    nextCursor:
      items.length > pageSize
        ? createMemberPaymentReceiptPageCursor(rows[pageSize - 1]!, sort)
        : null,
    receipts: rows.map(toMobileReceipt),
    state: "available",
    summary: {
      approvedReceipts: summary.approvedReceipts,
      correctionRequestedReceipts: summary.correctionRequestedReceipts,
      pendingReviewReceipts: summary.pendingReviewReceipts,
      rejectedReceipts: summary.rejectedReceipts,
    },
  }
}

export async function getMobileMemberReceiptDetail(
  input: { receiptId: string; tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberPaymentReceipt | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const member = await getMemberByUserId(input, prisma)
  if (!member) return null
  const receipt = await getMemberPaymentReceipt(
    input.tenantId,
    input.receiptId,
    { memberId: member.id },
    prisma
  )

  return receipt ? toMobileReceipt(receipt) : null
}

export async function createMobileMemberReceiptForSession(
  input: {
    allocations: PaymentReceiptAllocationInput[]
    channel?: "cash" | "transfer" | "manual" | "payroll"
    memberNotes?: string | null
    paidAt: Date
    paymentReference?: string | null
    proofDocumentName?: string | null
    proofDocumentUrl?: string | null
    tenantId: string
    totalAmount: number
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error("Receipts are unavailable without database configuration.")
  const member = await getMemberByUserId(input, prisma)
  if (!member)
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting receipts."
    )
  const profile = await getTenantOperationProfile(input.tenantId, prisma)
  if (!profile.services.payment_receipts.canMemberCreate) {
    throw ExpectedQueryError.precondition(
      "Payment receipt self-service is not enabled for this cooperative."
    )
  }
  return toMobileReceipt(
    await createMemberPaymentReceipt(
      {
        ...input,
        memberId: member.id,
        submittedByUserId: input.userId,
        requireProofUploadRecord: true,
      },
      prisma
    )
  )
}
