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
  type MemberPaymentReceiptRow,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import { getMemberByUserId } from "./members"
import { getTenantOperationProfile } from "./operation-profile"
import { listMemberContributionPlans } from "./contributions"
import { listMemberLoans } from "./loans"
import { listProcurementRequests } from "./procurement"
import { listFoodPurchaseApplications } from "./food-purchase"
import { listProjectFinancingRequests } from "./project-financing"
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

async function getReceiptCategories(input: {
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  const [profile, plans, loans, procurement, foodPurchase, projectFinancing] =
    await Promise.all([
      getTenantOperationProfile(input.tenantId, input.prisma),
      listMemberContributionPlans(
        { memberId: input.memberId, tenantId: input.tenantId },
        input.prisma
      ),
      listMemberLoans(
        { memberId: input.memberId, tenantId: input.tenantId },
        input.prisma
      ),
      listProcurementRequests(
        { limit: 100, memberId: input.memberId, tenantId: input.tenantId },
        input.prisma
      ),
      listFoodPurchaseApplications(
        { limit: 100, memberId: input.memberId, tenantId: input.tenantId },
        input.prisma
      ),
      listProjectFinancingRequests(
        { limit: 100, memberId: input.memberId, tenantId: input.tenantId },
        input.prisma
      ),
    ])

  const planTargets = plans
    .filter((plan) => plan.isActive)
    .map((plan) => ({
      id: plan.id,
      label: `${Number(plan.amount).toLocaleString("en-NG")} active commitment`,
      outstandingAmount: null,
    }))
  const loanTargets = loans
    .filter((loan) => ["approved", "disbursed", "active"].includes(loan.status))
    .map((loan) => ({
      id: loan.id,
      label: `${loan.loanProduct.name} · ${Number(loan.outstandingPrincipal).toLocaleString("en-NG")} outstanding`,
      outstandingAmount: Number(loan.outstandingPrincipal),
    }))
  const procurementTargets = procurement.flatMap((request) =>
    request.repaymentScheduleItems
      .filter((item) => {
        const outstanding = Number(item.amount) - Number(item.paidAmount)
        return (
          ["due", "overdue", "partially_paid", "pending"].includes(
            item.status
          ) && outstanding > 0
        )
      })
      .map((item) => {
        const outstanding = Number(item.amount) - Number(item.paidAmount)
        return {
          id: item.id,
          label: `${request.itemName} #${item.installmentNumber} · ${outstanding.toLocaleString("en-NG")} due`,
          outstandingAmount: outstanding,
        }
      })
  )
  const foodTargets = foodPurchase
    .filter((application) => {
      const outstanding =
        Number(application.approvedAmount ?? 0) - Number(application.paidAmount)
      return application.status === "approved" && outstanding > 0
    })
    .map((application) => {
      const outstanding =
        Number(application.approvedAmount ?? 0) - Number(application.paidAmount)
      return {
        id: application.id,
        label: `${application.itemDescription ?? "Foodstuff Purchase"} · ${outstanding.toLocaleString("en-NG")} due`,
        outstandingAmount: outstanding,
      }
    })
  const projectTargets = projectFinancing
    .filter((request) => {
      const outstanding =
        Number(request.approvedAmount ?? 0) - Number(request.paidAmount)
      return (
        request.approvedStructure === "repayable_facility" &&
        ["approved", "active"].includes(request.status) &&
        outstanding > 0
      )
    })
    .map((request) => {
      const outstanding =
        Number(request.approvedAmount ?? 0) - Number(request.paidAmount)
      return {
        id: request.id,
        label: `${request.businessName} · ${outstanding.toLocaleString("en-NG")} due`,
        outstandingAmount: outstanding,
      }
    })

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
    profile.services.procurement.accessMode !== "disabled" ||
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
    profile.services.food_purchase.accessMode !== "disabled" ||
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
    canCreateReceipt: profile.services.payment_receipts.canMemberCreate,
    canCreateSupportCase: profile.services.support_cases.canMemberCreate,
    options,
  }
}

async function getReceiptPage(input: {
  cursor?: string | null
  memberId: string
  prisma: PrismaClient
  tenantId: string
}) {
  const pageSize = 20
  const page = await listMemberPaymentReceiptPage(
    input.tenantId,
    {
      cursor: input.cursor,
      memberId: input.memberId,
      pageSize: pageSize + 1,
      sort: ["submittedAt", "desc"],
    },
    input.prisma
  )
  const rows = page.items.slice(0, pageSize)
  return {
    nextCursor:
      page.items.length > pageSize && rows.at(-1)
        ? createMemberPaymentReceiptPageCursor(rows.at(-1)!, [
            "submittedAt",
            "desc",
          ])
        : null,
    rows,
  }
}

export async function getMobileMemberReceiptSnapshot(
  input: { cursor?: string | null; tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberReceiptSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")
  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")
  const [summary, categories, page] = await Promise.all([
    getMemberScopedPaymentReceiptSummary(
      { memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getReceiptCategories({
      memberId: member.id,
      prisma,
      tenantId: input.tenantId,
    }),
    getReceiptPage({
      cursor: input.cursor,
      memberId: member.id,
      prisma,
      tenantId: input.tenantId,
    }),
  ])
  return {
    canCreateReceipt: categories.canCreateReceipt,
    canCreateSupportCase: categories.canCreateSupportCase,
    categories: categories.options,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    nextCursor: page.nextCursor,
    receipts: page.rows.map(toMobileReceipt),
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
      },
      prisma
    )
  )
}
