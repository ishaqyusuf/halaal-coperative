import type {
  FoodPurchaseApplication,
  FoodPurchaseCommandResult,
  FoodPurchaseLane,
  FoodPurchaseWorkspace,
} from "../model/admin-food-purchase-operations-types"

const now = new Date().toISOString()
const cycle = {
  accountingNotes: null,
  accountingSubmittedAt: null,
  accountingSubmittedByUser: null,
  accountingSubmittedByUserId: null,
  createdAt: now,
  id: "44444444-4444-4444-8444-444444444444",
  operatingExpenseAmount: null,
  periodMonth: "2026-08-01T00:00:00.000Z",
  profitAmount: null,
  purchaseCostAmount: null,
  releasedAmount: 1_200_000,
  releasedAt: now,
  releasedByUser: {
    fullName: "Fatima Yusuf",
    id: "55555555-5555-4555-8555-555555555555",
  },
  releasedByUserId: "55555555-5555-4555-8555-555555555555",
  releaseNotes: "Committee release evidence verified by finance.",
  salesAmount: null,
  status: "open" as const,
  updatedAt: now,
}

const applications: FoodPurchaseApplication[] = [
  {
    approvedAmount: null,
    approvedPaybackMonths: null,
    allowsCommitmentReductionDuringPayback: false,
    cycle: {
      id: cycle.id,
      periodMonth: cycle.periodMonth,
      releasedAmount: cycle.releasedAmount,
      status: cycle.status,
    },
    cycleId: cycle.id,
    id: "66666666-6666-4666-8666-666666666666",
    itemDescription: "Rice and beans",
    member: {
      fullName: "Amina Bello",
      id: "77777777-7777-4777-8777-777777777777",
      memberNumber: "ABC-0123",
    },
    outstandingAmount: 0,
    paidAmount: 0,
    paidAt: null,
    policyMaximumPaybackMonths: 6,
    requestedAmount: 180_000,
    requestedAt: now,
    requestedPaybackMonths: 4,
    requestNotes: "Monthly household food allocation.",
    reviewedAt: null,
    reviewNotes: null,
    status: "submitted",
  },
  {
    approvedAmount: 200_000,
    approvedPaybackMonths: 4,
    allowsCommitmentReductionDuringPayback: false,
    cycle: {
      id: cycle.id,
      periodMonth: cycle.periodMonth,
      releasedAmount: cycle.releasedAmount,
      status: cycle.status,
    },
    cycleId: cycle.id,
    id: "88888888-8888-4888-8888-888888888888",
    itemDescription: "Maize and millet",
    member: {
      fullName: "Khadija Musa",
      id: "99999999-9999-4999-8999-999999999999",
      memberNumber: "ABC-0148",
    },
    outstandingAmount: 75_000,
    paidAmount: 125_000,
    paidAt: null,
    policyMaximumPaybackMonths: 6,
    requestedAmount: 200_000,
    requestedAt: now,
    requestedPaybackMonths: 4,
    requestNotes: null,
    reviewedAt: now,
    reviewNotes: "Approved within the cycle and member obligation caps.",
    status: "approved",
  },
]

export async function getDevFoodPurchaseWorkspace(input: {
  cursor?: string
  cycleId?: string
  lane: FoodPurchaseLane
  search?: string
}): Promise<FoodPurchaseWorkspace> {
  const query = input.search?.toLowerCase() ?? ""
  const visible = applications.filter((application) =>
    `${application.member.fullName} ${application.itemDescription}`
      .toLowerCase()
      .includes(query)
  )
  return {
    applications: input.lane === "applications" ? visible : [],
    capabilities: {
      releaseFunds: true,
      reviewAccounting: true,
      reviewApplications: true,
      submitAccounting: true,
      view: true,
    },
    currencyCode: "NGN",
    cycles: [cycle],
    generatedAt: now,
    lane: input.lane,
    nextApplicationCursor: null,
    selectedCycle: cycle,
    summary: {
      approvedAmount: 760_000,
      allocationShortfallAmount: 0,
      availableAmount: 440_000,
      outstandingAmount: 420_000,
      paidAmount: 340_000,
      pendingApplications: 2,
      requestedAmount: 1_060_000,
      totalApplications: 8,
    },
  }
}

export async function getDevFoodPurchaseApplicationDetail(id: string) {
  return (
    applications.find((application) => application.id === id) ?? applications[0]
  )
}

export async function runDevFoodPurchaseCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<FoodPurchaseCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
