import { describe, expect, test } from "bun:test"
import type {
  MobileMemberProcurement,
  MobileMemberProcurementRequest,
} from "./member-procurement-types"
import {
  getActiveProcurementRequest,
  presentMemberProcurementOverview,
  presentMemberProcurementRequest,
} from "./member-procurement-presentation"

const activeRequest: MobileMemberProcurementRequest = {
  approvedCost: 315_000,
  approvedMonthlyRepayment: 35_000,
  approvedRepaymentMonths: 9,
  estimatedMonthlyRepayment: 35_000,
  id: "procurement-active",
  itemDescription: "Energy-efficient freezer",
  itemName: "Chest freezer",
  outstandingAmount: 245_000,
  purchasedAt: "2026-07-15T00:00:00.000Z",
  purchaseReference: "PUR-0123",
  requestedAt: "2026-06-10T00:00:00.000Z",
  requestedCost: 320_000,
  requestedRepaymentMonths: 9,
  reviewNotes: null,
  scheduleItems: [
    {
      amount: 35_000,
      dueDate: "2026-09-15T00:00:00.000Z",
      id: "schedule-1",
      installmentNumber: 3,
      paidAmount: 0,
      status: "due",
    },
    {
      amount: 35_000,
      dueDate: "2026-10-15T00:00:00.000Z",
      id: "schedule-2",
      installmentNumber: 4,
      paidAmount: 0,
      status: "due",
    },
  ],
  status: "purchased",
  vendorName: "Aminah Appliances Ltd",
}

function createProcurement(
  requests: MobileMemberProcurementRequest[]
): MobileMemberProcurement {
  return {
    canCreateRequest: true,
    capability: {
      accessMode: "member_self_service",
      canMemberCreate: true,
      canSettleExisting: true,
      canStaffCreate: true,
      canViewExisting: true,
      serviceKey: "procurement",
      shouldShowInMemberNav: true,
      shouldShowInStaffNav: true,
    },
    chargeOptions: [],
    generatedAt: "2026-09-01T00:00:00.000Z",
    member: null,
    policy: {
      activeFinancingBlocksProcurement: false,
      allowsCommitmentReductionDuringPayback: false,
      maximumActiveObligationsPerMember: 1,
      maximumPaybackMonths: 12,
    },
    requestNextCursor: null,
    requests,
    restrictionReasons: [],
    state: "available",
    summary: {
      activeRequests: 1,
      approvedRequests: 1,
      dueScheduleItems: 2,
      outstandingAmount: 245_000,
      overdueScheduleItems: 0,
      pendingRequests: 0,
      totalRequests: requests.length,
    },
  }
}

describe("member procurement presentation", () => {
  test("selects the open purchased obligation", () => {
    expect(getActiveProcurementRequest([activeRequest])?.id).toBe(
      "procurement-active"
    )
  })

  test("presents accurate payment progress and removes the active row from history", () => {
    const history = { ...activeRequest, id: "history", outstandingAmount: 0 }
    const result = presentMemberProcurementOverview(
      createProcurement([activeRequest, history]),
      "NGN"
    )

    expect(result.balance).toBe("₦245,000")
    expect(result.monthlyAmount).toBe("₦35,000")
    expect(result.paidAmount).toBe("₦70,000")
    expect(result.progressPercent).toBeCloseTo(22.22, 2)
    expect(result.nextDueDate).toBe("15 Sep 2026")
    expect(result.historyRequests.map((request) => request.id)).toEqual([
      "history",
    ])
  })

  test("presents a compact history row without detail-sheet copy", () => {
    expect(presentMemberProcurementRequest(activeRequest, "NGN")).toEqual({
      accessibilityLabel: "View Chest freezer procurement details, Purchased",
      amount: "₦320,000",
      date: "10 Jun 2026",
      dueCount: 2,
      status: "Purchased",
      term: "9 months",
      title: "Chest freezer",
    })
  })
})
