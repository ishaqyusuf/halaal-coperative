import type {
  ProcurementCommandResult,
  ProcurementLane,
  ProcurementOperation,
  ProcurementWorkspace,
} from "../model/admin-procurement-operations-types"

const today = new Date().toISOString().slice(0, 10)
const request: ProcurementOperation = {
  approvedCost: 480000,
  approvedMonthlyRepayment: 40000,
  approvedRepaymentMonths: 12,
  createdAt: new Date().toISOString(),
  id: "11111111-1111-4111-8111-111111111111",
  itemDescription: "Equipment for a small tailoring business.",
  itemName: "Industrial sewing machine",
  lane: "activate",
  member: {
    email: "amina@example.test",
    fullName: "Amina Bello",
    id: "22222222-2222-4222-8222-222222222222",
    memberNumber: "ABC-0123",
  },
  nextDue: null,
  outstandingAmount: 0,
  overdueCount: 0,
  policyMaximumPaybackMonths: 12,
  purchasedAt: null,
  purchaseNotes: null,
  purchaseReference: null,
  repaymentScheduleItems: [],
  requestedAt: new Date().toISOString(),
  requestedCost: 500000,
  requestedRepaymentMonths: 12,
  reviewedAt: new Date().toISOString(),
  reviewedByUser: {
    email: "finance@example.test",
    fullName: "Finance Reviewer",
    id: "33333333-3333-4333-8333-333333333333",
  },
  reviewNotes: "Approved within the cooperative policy cap.",
  status: "approved",
  vendorName: "Bright Stitches Ltd",
}

export async function getDevProcurementWorkspace(input: {
  lane: ProcurementLane
  search?: string
}): Promise<ProcurementWorkspace> {
  const matches = input.lane === request.lane &&
    (!input.search || `${request.member.fullName} ${request.itemName}`.toLowerCase().includes(input.search.toLowerCase()))
  return {
    capabilities: { activate: true, review: true, submitPayment: true, view: true },
    currencyCode: "NGN",
    generatedAt: new Date().toISOString(),
    items: matches ? [request] : [],
    lane: input.lane,
    summary: {
      activeRequests: 9,
      approvedRequests: 1,
      dueScheduleItems: 4,
      outstandingAmount: 1240000,
      overdueScheduleItems: 1,
      pendingRequests: 2,
      rejectedRequests: 1,
      totalApprovedCost: 2680000,
      totalRequestedCost: 2900000,
      totalRequests: 30,
    },
  }
}

export async function getDevProcurementDetail(_procurementRequestId?: string) {
  return { ...request, requestedAt: `${today}T09:30:00.000Z` }
}

export async function runDevProcurementCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<ProcurementCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
