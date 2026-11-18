import { describe, expect, test } from "bun:test"

import {
  clearPrimedMobileAppAccessSnapshot,
  PRIMED_ACCESS_SNAPSHOT_TTL_MS,
  primeMobileAppAccessSnapshot,
  takePrimedMobileAppAccessSnapshot,
} from "./primed-access-snapshot"

const snapshot = {
  accessAllowed: true,
  accessEndsAt: null,
  membershipId: "membership-1",
  status: "active" as const,
  tenantId: "tenant-1",
  userBinding: "user-1",
}

describe("primed access snapshot", () => {
  test("is taken once, only for the same token", () => {
    primeMobileAppAccessSnapshot("token-a", snapshot, 1_000)
    expect(takePrimedMobileAppAccessSnapshot("token-b", 1_001)).toBeNull()
    // A mismatched take still consumes it: it never leaks to a later session.
    expect(takePrimedMobileAppAccessSnapshot("token-a", 1_002)).toBeNull()

    primeMobileAppAccessSnapshot("token-a", snapshot, 1_000)
    expect(takePrimedMobileAppAccessSnapshot("token-a", 1_001)).toBe(snapshot)
    expect(takePrimedMobileAppAccessSnapshot("token-a", 1_002)).toBeNull()
  })

  test("expires and can be cleared", () => {
    primeMobileAppAccessSnapshot("token-a", snapshot, 0)
    expect(
      takePrimedMobileAppAccessSnapshot(
        "token-a",
        PRIMED_ACCESS_SNAPSHOT_TTL_MS + 1
      )
    ).toBeNull()

    primeMobileAppAccessSnapshot("token-a", snapshot, 0)
    clearPrimedMobileAppAccessSnapshot()
    expect(takePrimedMobileAppAccessSnapshot("token-a", 1)).toBeNull()
  })

  test("ignores a missing snapshot", () => {
    primeMobileAppAccessSnapshot("token-a", undefined, 0)
    expect(takePrimedMobileAppAccessSnapshot("token-a", 1)).toBeNull()
  })
})
