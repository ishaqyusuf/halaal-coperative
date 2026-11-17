import { describe, expect, test } from "bun:test"

import {
  canManageMobileOperationProfile,
  isOperationProfileReadOnly,
  isRestrictiveOperationProfileChange,
} from "./operation-profile-policy"

describe("mobile Operation Profile policy", () => {
  test("keeps management limited to cooperative admins", () => {
    expect(canManageMobileOperationProfile("super_admin")).toBe(true)
    expect(canManageMobileOperationProfile("tenant_admin")).toBe(true)
    expect(canManageMobileOperationProfile("finance_officer")).toBe(false)
    expect(canManageMobileOperationProfile("operations_officer")).toBe(false)
    expect(canManageMobileOperationProfile("member")).toBe(false)
  })

  test("requires evidence for every restrictive transition", () => {
    expect(
      isRestrictiveOperationProfileChange({
        next: "office_only",
        previous: "member_self_service",
      })
    ).toBe(true)
    expect(
      isRestrictiveOperationProfileChange({
        next: "disabled",
        previous: "office_only",
      })
    ).toBe(true)
    expect(
      isRestrictiveOperationProfileChange({
        next: "read_only",
        previous: "disabled",
      })
    ).toBe(true)
    expect(
      isRestrictiveOperationProfileChange({
        next: "member_self_service",
        previous: "office_only",
      })
    ).toBe(false)
  })

  test("blocks writes for offline, stale, and platform-limited states", () => {
    expect(
      isOperationProfileReadOnly({
        isLimited: false,
        isOnline: false,
        isStale: false,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        isLimited: false,
        isOnline: true,
        isStale: true,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        isLimited: true,
        isOnline: true,
        isStale: false,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        isLimited: false,
        isOnline: true,
        isStale: false,
      })
    ).toBe(false)
  })
})
