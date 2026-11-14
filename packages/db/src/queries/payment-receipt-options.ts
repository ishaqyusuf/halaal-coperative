import type { PrismaClient } from "../../generated/prisma/client"
import { listMemberContributionPlans } from "./contributions"
import { listFoodPurchaseApplications } from "./food-purchase"
import { listMemberLoans } from "./loans"
import { getTenantOperationProfile } from "./operation-profile"
import { listProcurementRequests } from "./procurement"
import { listProjectFinancingRequests } from "./project-financing"

export type PaymentReceiptOption = {
  id: string
  label: string
  memberId: string
}

export type PaymentReceiptCategoryValue =
  | "commitment"
  | "special_savings"
  | "loan_servicing"
  | "loan_extra_payment"
  | "shares"
  | "procurement"
  | "project_financing"
  | "food_purchase"
  | "other"

export type PaymentReceiptCategoryOption = {
  label: string
  value: PaymentReceiptCategoryValue
}

export type PaymentReceiptMemberOptions = {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
}

const baseCategoryOptions: PaymentReceiptCategoryOption[] = [
  { label: "Commitment", value: "commitment" },
  { label: "Special savings", value: "special_savings" },
  { label: "Loan servicing", value: "loan_servicing" },
  { label: "Extra loan payment", value: "loan_extra_payment" },
  { label: "Shares", value: "shares" },
  { label: "Project financing", value: "project_financing" },
  { label: "Other", value: "other" },
]

const payableProcurementScheduleStatuses = new Set([
  "due",
  "overdue",
  "partially_paid",
  "pending",
])

function naira(value: number) {
  return value.toLocaleString("en-NG")
}

export function buildPaymentReceiptCategoryOptions(input: {
  foodPurchaseAccessMode: string
  foodPurchaseApplicationsCount: number
  procurementAccessMode: string
  procurementSchedulesCount: number
}): PaymentReceiptCategoryOption[] {
  const categoryOptions = [...baseCategoryOptions]
  const shouldShowProcurement =
    input.procurementAccessMode !== "disabled" ||
    input.procurementSchedulesCount > 0
  const shouldShowFoodPurchase =
    input.foodPurchaseAccessMode !== "disabled" ||
    input.foodPurchaseApplicationsCount > 0

  if (shouldShowProcurement) {
    categoryOptions.splice(5, 0, { label: "Procurement", value: "procurement" })
  }

  if (shouldShowFoodPurchase) {
    categoryOptions.splice(shouldShowProcurement ? 7 : 6, 0, {
      label: "Foodstuff Purchase",
      value: "food_purchase",
    })
  }

  return categoryOptions
}

// Everything a receipt for one member can be allocated to: active plans,
// open loans, unpaid procurement instalments, approved foodstuff purchases and
// repayable project financing. Loaded when staff pick a member in the receipt
// sheet (and for a member's own receipts), never for the whole cooperative.
export async function listPaymentReceiptMemberOptions(
  input: { memberId: string; tenantId: string },
  prismaOverride?: PrismaClient
): Promise<PaymentReceiptMemberOptions> {
  const scope = { memberId: input.memberId, tenantId: input.tenantId }
  const [
    plans,
    loans,
    procurementRequests,
    foodPurchaseApplications,
    activeProjectFinancing,
    approvedProjectFinancing,
    operationProfile,
  ] = await Promise.all([
    listMemberContributionPlans(scope, prismaOverride),
    listMemberLoans(scope, prismaOverride),
    listProcurementRequests({ ...scope, limit: 100, status: "active" }, prismaOverride),
    listFoodPurchaseApplications(
      { ...scope, limit: 100, status: "approved" },
      prismaOverride
    ),
    listProjectFinancingRequests(
      { ...scope, limit: 100, status: "active" },
      prismaOverride
    ),
    listProjectFinancingRequests(
      { ...scope, limit: 100, status: "approved" },
      prismaOverride
    ),
    getTenantOperationProfile(input.tenantId, prismaOverride),
  ])

  const procurementSchedules = procurementRequests.flatMap((request) =>
    request.repaymentScheduleItems
      .map((schedule) => ({
        outstanding: Number(schedule.amount) - Number(schedule.paidAmount),
        schedule,
      }))
      .filter(
        ({ outstanding, schedule }) =>
          payableProcurementScheduleStatuses.has(schedule.status) &&
          outstanding > 0
      )
      .map(({ outstanding, schedule }) => ({
        id: schedule.id,
        label: `${request.itemName} #${schedule.installmentNumber} - ${naira(outstanding)}`,
        memberId: request.memberId,
      }))
  )
  const foodPurchaseOptions = foodPurchaseApplications
    .map((application) => ({
      application,
      outstanding:
        Number(application.approvedAmount ?? 0) - Number(application.paidAmount),
    }))
    .filter(
      ({ application, outstanding }) =>
        application.status === "approved" && outstanding > 0
    )
    .map(({ application, outstanding }) => ({
      id: application.id,
      label: `${
        application.itemDescription ??
        application.cycle.periodMonth.toISOString().slice(0, 7)
      } - ${naira(outstanding)}`,
      memberId: application.memberId,
    }))
  const projectFinancingRequests = [
    ...activeProjectFinancing,
    ...approvedProjectFinancing,
  ]
    .map((request) => ({
      outstanding:
        Number(request.approvedAmount ?? 0) - Number(request.paidAmount),
      request,
    }))
    .filter(
      ({ outstanding, request }) =>
        request.approvedStructure === "repayable_facility" &&
        ["approved", "active"].includes(request.status) &&
        outstanding > 0
    )
    .map(({ outstanding, request }) => ({
      id: request.id,
      label: `${request.businessName} - ${naira(outstanding)}`,
      memberId: request.memberId,
    }))

  return {
    categoryOptions: buildPaymentReceiptCategoryOptions({
      foodPurchaseAccessMode: operationProfile.services.food_purchase.accessMode,
      foodPurchaseApplicationsCount: foodPurchaseOptions.length,
      procurementAccessMode: operationProfile.services.procurement.accessMode,
      procurementSchedulesCount: procurementSchedules.length,
    }),
    commitmentPlans: plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        id: plan.id,
        label: naira(Number(plan.amount)),
        memberId: plan.member.id,
      })),
    foodPurchaseApplications: foodPurchaseOptions,
    loans: loans
      .filter((loan) => ["approved", "disbursed", "active"].includes(loan.status))
      .map((loan) => ({
        id: loan.id,
        label: `${loan.loanProduct.name} - ${naira(Number(loan.outstandingPrincipal))}`,
        memberId: loan.member.id,
      })),
    procurementSchedules,
    projectFinancingRequests,
  }
}
