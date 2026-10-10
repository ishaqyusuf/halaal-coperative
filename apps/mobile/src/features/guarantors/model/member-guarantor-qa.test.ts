import { describe, expect, test } from "bun:test"
import type { MobileMemberGuarantorSnapshot } from "./member-guarantor-types"
import {
  getGuarantorResponseRestriction,
  presentMemberGuarantorApprovalsForQa,
} from "./member-guarantor-qa"

const snapshot = {
  approvals: [{ id: "guarantor-1", status: "pending" }],
  generatedAt: "2026-09-01T09:00:00.000Z",
  member: { id: "member-1", memberNumber: "HV-1001", name: "Yusuf" },
  state: "available",
  summary: {
    approvedApprovals: 0,
    pendingApprovals: 1,
    rejectedApprovals: 0,
    totalApprovals: 1,
  },
} as unknown as MobileMemberGuarantorSnapshot

describe("member guarantor QA presentation", () => {
  test("empties the list without changing the service state", () => {
    const result = presentMemberGuarantorApprovalsForQa(snapshot, "empty")

    expect(result.approvals).toEqual([])
    expect(result.summary.totalApprovals).toBe(0)
    expect(result.state).toBe("available")
  })

  test("marks saved data stale and blocks response modes", () => {
    const stale = presentMemberGuarantorApprovalsForQa(snapshot, "offline")

    expect(stale.cache?.status).toBe("stale")
    expect(stale.cache?.reason).toBe("offline")
    expect(getGuarantorResponseRestriction("blocked")).toContain("paused")
    expect(getGuarantorResponseRestriction("office-only")).toContain("office")
    expect(getGuarantorResponseRestriction("read-only")).toContain("viewing")
  })
})
