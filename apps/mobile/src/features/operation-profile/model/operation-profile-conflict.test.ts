import { describe, expect, test } from "bun:test"
import {
  isOperationProfileConflictError,
  resolveOperationProfileConflictRefresh,
} from "./operation-profile-conflict"
import type { MobileOperationProfileSnapshot } from "./operation-profile-types"

function snapshot(
  accessMode: MobileOperationProfileSnapshot["services"][number]["accessMode"]
): MobileOperationProfileSnapshot {
  return {
    policy: {
      foodPurchaseMaximumActiveObligationsPerMember: 1,
      foodPurchaseRequiresOpenCycle: true,
      procurementMaximumActiveObligationsPerMember: 1,
    },
    reviewedAt: null,
    reviewedByUserId: null,
    services: [
      {
        accessMode,
        canMemberCreate: false,
        canSettleExisting: true,
        canStaffCreate: accessMode === "office_only",
        canViewExisting: true,
        effectiveAccessMode: accessMode,
        effectiveCanMemberCreate: false,
        effectiveCanStaffCreate: accessMode === "office_only",
        serviceKey: "procurement",
        shouldShowInMemberNav: false,
        shouldShowInStaffNav: accessMode !== "disabled",
      },
    ],
    subscription: {
      accessEnabled: true,
      planCode: "standard",
      planName: "Standard",
      reason: null,
      status: "active",
    },
    tenant: { id: "tenant-1", name: "Cooperative" },
    updatedAt: "2026-09-05T00:00:00.000Z",
  }
}

describe("Operation Profile stale-conflict recovery", () => {
  test("recognizes tRPC client and direct conflict codes", () => {
    expect(
      isOperationProfileConflictError({ data: { code: "CONFLICT" } })
    ).toBe(true)
    expect(
      isOperationProfileConflictError({
        shape: { data: { code: "CONFLICT" } },
      })
    ).toBe(true)
    expect(isOperationProfileConflictError({ code: "CONFLICT" })).toBe(true)
    expect(isOperationProfileConflictError(new Error("conflict"))).toBe(false)
  })

  test("requires another review when the latest mode differs from the draft", () => {
    expect(
      resolveOperationProfileConflictRefresh({
        nextAccessMode: "disabled",
        serviceKey: "procurement",
        snapshot: snapshot("office_only"),
      })
    ).toEqual({
      expectedAccessMode: "office_only",
      status: "ready_to_review",
    })
  })

  test("recognizes when another admin already applied the draft mode", () => {
    expect(
      resolveOperationProfileConflictRefresh({
        nextAccessMode: "disabled",
        serviceKey: "procurement",
        snapshot: snapshot("disabled"),
      })
    ).toEqual({
      expectedAccessMode: "disabled",
      status: "already_current",
    })
  })

  test("fails closed when the refreshed service is missing", () => {
    const value = snapshot("office_only")
    value.services = []

    expect(
      resolveOperationProfileConflictRefresh({
        nextAccessMode: "disabled",
        serviceKey: "procurement",
        snapshot: value,
      })
    ).toEqual({ status: "service_missing" })
  })
})
