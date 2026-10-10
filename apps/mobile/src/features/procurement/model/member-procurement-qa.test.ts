import { describe, expect, test } from "bun:test"
import type { MobileMemberProcurement } from "./member-procurement-types"
import { presentMemberProcurementForQa } from "./member-procurement-qa"
import {
  getProcurementPurchaseReferenceDetail,
  getVisibleProcurementPurchaseReference,
} from "./member-procurement-presentation"

const procurement = {
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
  generatedAt: "2026-08-31T09:00:00.000Z",
  requestNextCursor: "next-page",
  requests: [{ id: "request-1" }],
  restrictionReasons: [],
  summary: {
    activeRequests: 1,
    approvedRequests: 1,
    dueScheduleItems: 2,
    outstandingAmount: 50_000,
    overdueScheduleItems: 0,
    pendingRequests: 0,
    totalRequests: 1,
  },
} as unknown as MobileMemberProcurement

describe("member procurement QA presentation", () => {
  test("empties history with internally consistent totals", () => {
    const result = presentMemberProcurementForQa(procurement, "empty")

    expect(result.requests).toEqual([])
    expect(result.requestNextCursor).toBeNull()
    expect(result.summary.totalRequests).toBe(0)
    expect(result.summary.outstandingAmount).toBe(0)
    expect(result.canCreateRequest).toBe(true)
    expect(result.capability.accessMode).toBe("member_self_service")
    expect(result.capability.canMemberCreate).toBe(true)
    expect(result.restrictionReasons).toEqual([])
  })

  test("preserves history while blocking new commands", () => {
    const result = presentMemberProcurementForQa(procurement, "blocked")

    expect(result.canCreateRequest).toBe(false)
    expect(result.requests).toHaveLength(1)
    expect(result.restrictionReasons[0]).toContain(
      "active cooperative obligation"
    )
  })

  test("keeps readable history and sentence-cased restriction copy", () => {
    const result = presentMemberProcurementForQa(procurement, "read-only")

    expect(result.canCreateRequest).toBe(false)
    expect(result.capability.canViewExisting).toBe(true)
    expect(result.requests).toHaveLength(1)
    expect(result.restrictionReasons).toEqual([
      "Procurement is currently available for viewing only.",
    ])
  })
})

describe("member procurement presentation", () => {
  test("keeps operator references and hides internal opening-balance keys", () => {
    expect(getVisibleProcurementPurchaseReference("INV-100")).toBe("INV-100")
    expect(
      getVisibleProcurementPurchaseReference(
        "opening-balance:internal-record-id:procurement"
      )
    ).toBeNull()
    expect(
      getProcurementPurchaseReferenceDetail(
        "opening-balance:internal-record-id:procurement"
      )
    ).toBe("Imported historical record")
  })
})
