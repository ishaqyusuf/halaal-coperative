import type {
  MemberPaymentReceiptAllocationCategory,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  createOwnMemberPaymentReceipt,
  createMemberPaymentReceiptPageCursor,
  getMemberPaymentReceipt,
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceiptPage,
  listMemberPaymentReceiptPageWithoutTotal,
  type MemberPaymentReceiptRow,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import { getMemberByUserId } from "./members"
import { resolveTenantServiceCapabilities } from "./operation-profile"
import {
  getMemberReceiptSubmissionAccess,
  memberReceiptSubmissionAccessSql,
} from "./payment-receipt-member-access"
import { ExpectedQueryError } from "../query-error"
import {
  listMemberPayables,
  resolvePaymentAllocationSettings,
  type MemberPayable,
  type PaymentAllocationMode,
} from "./member-payables"

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
  /** The cooperative requires an upload or link on every member receipt. */
  proofRequired: boolean
  receipts: MobileMemberPaymentReceipt[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    /** Total applied (approved), ₦ (T30 strip). First page only. */
    appliedAmount?: number
    approvedReceipts: number
    /** Receipts still being checked, ₦ (T30 strip). */
    checkingAmount?: number
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
      memberShareApplicationId: allocation.memberShareApplicationId,
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
    proofRequired: false,
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

async function getReceiptServices(
  { memberId, tenantId }: { memberId: string; tenantId: string },
  prisma: PrismaClient
) {
  const [row] = await prisma.$queryRaw<Array<{
    canCreateReceipt: boolean
    proofRequired: boolean
    serviceModes: Record<string, unknown> | null
  }>>`
    SELECT ${memberReceiptSubmissionAccessSql({ memberId, tenantId })} AS "canCreateReceipt",
      COALESCE((
        SELECT payment_receipt_proof_required FROM tenant_policies
        WHERE tenant_id = ${tenantId}::uuid
      ), false) AS "proofRequired",
      (
        SELECT jsonb_object_agg(service_key::text, access_mode::text)
        FROM tenant_service_settings
        WHERE tenant_id = ${tenantId}::uuid
          AND service_key IN ('support_cases', 'procurement', 'food_purchase')
      ) AS "serviceModes"
  `
  return {
    canCreateReceipt: row?.canCreateReceipt === true,
    proofRequired: row?.proofRequired === true,
    services: resolveTenantServiceCapabilities(row?.serviceModes ?? {}),
  }
}

async function getReceiptCategories(input: {
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  const { memberId, prisma, tenantId } = input
  const scope = { memberId, tenantId }
  const [{ services, canCreateReceipt, proofRequired }, plans, loans, procurement, foodPurchase, projectFinancing] =
    await Promise.all([
      getReceiptServices(scope, prisma),
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
    canCreateReceipt,
    canCreateSupportCase: services.support_cases.canMemberCreate,
    options,
    proofRequired,
  }
}

export async function getMobileMemberReceiptFormOptions(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const member = await getMemberByUserId(input, prisma)
  if (!member)
    return { canCreateReceipt: false, categories: [], proofRequired: false }
  const { canCreateReceipt, options, proofRequired } = await getReceiptCategories({
    memberId: member.id,
    prisma,
    tenantId: input.tenantId,
  })
  return { canCreateReceipt, categories: options, proofRequired }
}

export type MobileMemberPayablesSnapshot = {
  canCreateReceipt: boolean
  /** `automatic`: a typed amount is applied in `payables` order. */
  mode: PaymentAllocationMode
  payables: MemberPayable[]
  proofRequired: boolean
}

/**
 * Record payment's one read (T30): the member's current payables in the
 * cooperative's order, the allocation mode, proof policy and self-service
 * switch. Member lookup, then one parallel batch of bounded reads.
 */
export async function getMobileMemberPayables(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberPayablesSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    return {
      canCreateReceipt: false,
      mode: "automatic",
      payables: [],
      proofRequired: false,
    }
  }
  // One policy read carries both the payment order and the proof rule.
  const [policy, canCreateReceipt] = await Promise.all([
    prisma.tenantPolicy.findUnique({
      select: {
        paymentAllocationLeftover: true,
        paymentAllocationMode: true,
        paymentAllocationOrder: true,
        paymentReceiptProofRequired: true,
      },
      where: { tenantId: input.tenantId },
    }),
    getMemberReceiptSubmissionAccess({ memberId: member.id, tenantId: input.tenantId }, prisma),
  ])
  const settings = resolvePaymentAllocationSettings(policy)
  const proofRequired = policy?.paymentReceiptProofRequired === true
  const payables = await listMemberPayables(
    { memberId: member.id, tenantId: input.tenantId },
    prisma,
    settings
  )
  return {
    canCreateReceipt,
    mode: settings.mode,
    payables,
    proofRequired,
  }
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
  const firstPage = !(compact && cursor)
  const [summary, capabilities, items] = await Promise.all([
    firstPage ? getMemberScopedPaymentReceiptSummary(scope, prisma) : null,
    compact
      ? getReceiptServices(scope, prisma).then(({ services, canCreateReceipt, proofRequired }) => ({
          canCreateReceipt,
          canCreateSupportCase: services.support_cases.canMemberCreate,
          options: [],
          proofRequired,
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
    proofRequired: capabilities.proofRequired,
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
      ...(summary
        ? {
            appliedAmount: summary.approvedAmount,
            checkingAmount: summary.pendingReviewAmount,
          }
        : {}),
      approvedReceipts: summary?.approvedReceipts ?? 0,
      correctionRequestedReceipts: summary?.correctionRequestedReceipts ?? 0,
      pendingReviewReceipts: summary?.pendingReviewReceipts ?? 0,
      rejectedReceipts: summary?.rejectedReceipts ?? 0,
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
  return toMobileReceipt(
    await createOwnMemberPaymentReceipt(
      {
        ...input,
        // No split: approval applies it in the cooperative's order (T30).
        autoAllocate: input.allocations.length === 0,
        memberId: member.id,
        submittedByUserId: input.userId,
        requireProofUploadRecord: true,
      },
      prisma
    )
  )
}
