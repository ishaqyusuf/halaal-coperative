import { describe, expect, test } from "bun:test"
import type { MobileMemberProjectFinancing } from "./member-project-financing-types"
import { presentMemberProjectFinancingForQa } from "./member-project-financing-qa"

const projectFinancing = {
  canCreateRequest: true,
  generatedAt: "2026-08-31T09:00:00.000Z",
  requestNextCursor: "next-page",
  requests: [{ id: "project-1" }],
  restrictionReasons: [],
  summary: {
    activeRequests: 1,
    approvedRequests: 1,
    outstandingAmount: 100_000,
    pendingRequests: 0,
    totalApprovedAmount: 100_000,
    totalRequestedAmount: 100_000,
    totalRequests: 1,
  },
} as unknown as MobileMemberProjectFinancing

describe("member project financing QA presentation", () => {
  test("empties history without retaining contradictory restrictions", () => {
    const result = presentMemberProjectFinancingForQa(
      projectFinancing,
      "empty"
    )

    expect(result.requests).toEqual([])
    expect(result.requestNextCursor).toBeNull()
    expect(result.summary.totalRequests).toBe(0)
    expect(result.summary.outstandingAmount).toBe(0)
    expect(result.canCreateRequest).toBe(true)
    expect(result.restrictionReasons).toEqual([])
  })

  test("distinguishes offline and stale snapshots", () => {
    expect(
      presentMemberProjectFinancingForQa(projectFinancing, "offline").cache
        ?.reason
    ).toBe("offline")
    expect(
      presentMemberProjectFinancingForQa(projectFinancing, "stale").cache
        ?.reason
    ).toBe("stale")
  })
})
