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

  test("blocks writes for offline, stale, and subscription-restricted states", () => {
    expect(
      isOperationProfileReadOnly({
        isOnline: false,
        subscriptionAccessEnabled: true,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        cacheStatus: "stale",
        isOnline: true,
        subscriptionAccessEnabled: true,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        isOnline: true,
        subscriptionAccessEnabled: false,
      })
    ).toBe(true)
    expect(
      isOperationProfileReadOnly({
        cacheStatus: "live",
        isOnline: true,
        subscriptionAccessEnabled: true,
      })
    ).toBe(false)
  })
})
