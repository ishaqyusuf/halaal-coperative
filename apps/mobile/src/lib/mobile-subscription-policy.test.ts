import { describe, expect, test } from "bun:test"
import {
  canStartNativeStorePurchase,
  canRoleManageSubscription,
  getPlanActionLabel,
  getSubscriptionExceptionPresentation,
  getSubscriptionStatusPresentation,
  getSubscriptionWarning,
  isSubscriptionReadOnly,
  isStorePurchaseBindingCurrent,
} from "./mobile-subscription-policy"

describe("mobile subscription policy", () => {
  test("purchase binding must match the reviewed cooperative subscription", () => {
    expect(
      isStorePurchaseBindingCurrent("subscription-a", "subscription-a")
    ).toBe(true)
    expect(
      isStorePurchaseBindingCurrent("subscription-b", "subscription-a")
    ).toBe(false)
    expect(isStorePurchaseBindingCurrent("subscription-a", null)).toBe(false)
    expect(isStorePurchaseBindingCurrent(null, "subscription-a")).toBe(false)
  })

  test("requires a fresh successful plan read and a ready store before a native purchase", () => {
    const ready = {
      hasSnapshot: true,
      hasSubscription: true,
      billingInfrastructureAvailable: true,
      planAvailable: true,
      isLoading: false,
      error: null,
      isOnline: true,
      isStale: false,
      storeReady: true,
      storeBusy: false,
      purchaseNeedsReview: false,
      isCurrentPlan: false,
    }
    expect(canStartNativeStorePurchase(ready)).toBe(true)
    for (const blocked of [
      { error: "Plan details are unavailable" },
      { isLoading: true },
      { hasSnapshot: false },
      { hasSubscription: false },
      { billingInfrastructureAvailable: false },
      { planAvailable: false },
      { storeReady: false },
      { isStale: true },
      { isOnline: false },
      { purchaseNeedsReview: true },
      { storeBusy: true },
      { isCurrentPlan: true },
    ]) {
      expect(canStartNativeStorePurchase({ ...ready, ...blocked })).toBe(false)
    }
  })

  test("presents offline cached data as read-only with one recovery action", () => {
    expect(
      getSubscriptionExceptionPresentation({
        canManage: true,
        error: null,
        hasSnapshot: true,
        isOnline: false,
        isStale: false,
      })
    ).toMatchObject({
      actionLabel: "Check connection",
      kind: "offline",
      title: "You're offline",
    })
  })

  test("keeps load errors and permission denial distinct", () => {
    expect(
      getSubscriptionExceptionPresentation({
        canManage: true,
        error: "Network request failed",
        hasSnapshot: false,
        isOnline: true,
        isStale: false,
      })
    ).toMatchObject({ kind: "load_error", tone: "destructive" })
    expect(
      getSubscriptionExceptionPresentation({
        canManage: false,
        error: null,
        hasSnapshot: false,
        isOnline: true,
        isStale: false,
      })
    ).toMatchObject({ kind: "denied", tone: "neutral" })
  })

  test("requires a refresh for stale data even after connectivity returns", () => {
    expect(
      getSubscriptionExceptionPresentation({
        canManage: true,
        error: null,
        hasSnapshot: true,
        isOnline: true,
        isStale: true,
      })
    ).toMatchObject({ actionLabel: "Refresh details", kind: "stale" })
  })

  test("keeps commercial details admin-only", () => {
    expect(canRoleManageSubscription("tenant_admin")).toBe(true)
    expect(canRoleManageSubscription("super_admin")).toBe(true)
    expect(canRoleManageSubscription("finance_officer")).toBe(false)
    expect(canRoleManageSubscription("member")).toBe(false)
  })

  test("shows past-due and grace states as warnings", () => {
    expect(getSubscriptionStatusPresentation("past_due").tone).toBe("warning")
    expect(getSubscriptionStatusPresentation("grace").label).toBe(
      "Grace period"
    )
  })

  test("turns plan selection read-only while offline", () => {
    expect(
      getPlanActionLabel({
        currentPlanCode: "starter",
        isOnline: false,
        planCode: "standard",
      })
    ).toBe("Online required")
  })

  test("fails plan commands closed for offline or stale snapshots", () => {
    expect(
      isSubscriptionReadOnly({ cacheStatus: "fresh", isOnline: false })
    ).toBe(true)
    expect(
      isSubscriptionReadOnly({ cacheStatus: "stale", isOnline: true })
    ).toBe(true)
    expect(
      isSubscriptionReadOnly({ cacheStatus: "fresh", isOnline: true })
    ).toBe(false)
  })

  test("distinguishes current, self-serve, and enterprise actions", () => {
    expect(
      getPlanActionLabel({
        currentPlanCode: "standard",
        isOnline: true,
        planCode: "standard",
      })
    ).toBe("Current plan")
    expect(
      getPlanActionLabel({
        currentPlanCode: "standard",
        isOnline: true,
        planCode: "growth",
      })
    ).toBe("Request plan change")
    expect(
      getPlanActionLabel({
        currentPlanCode: "standard",
        isOnline: true,
        planCode: "enterprise",
      })
    ).toBe("Contact billing")
  })

  test("presents every governed subscription state semantically", () => {
    expect(
      [
        "free_beta",
        "trialing",
        "active",
        "enterprise",
        "manual",
        "paid",
        "open",
        "past_due",
        "grace",
        "suspended",
        "cancelled",
      ].map((status) => getSubscriptionStatusPresentation(status))
    ).toEqual([
      { label: "Free beta", tone: "warning" },
      { label: "Trial", tone: "warning" },
      { label: "Active", tone: "success" },
      { label: "Managed", tone: "success" },
      { label: "Managed", tone: "success" },
      { label: "Paid", tone: "success" },
      { label: "Open", tone: "warning" },
      { label: "Past due", tone: "warning" },
      { label: "Grace period", tone: "warning" },
      { label: "Suspended", tone: "destructive" },
      { label: "Cancelled", tone: "destructive" },
    ])
  })

  test("explains capacity boundaries without disabling existing records", () => {
    const warning = getSubscriptionWarning({
      status: "active",
      usage: { isAtCapacity: true, isOverCapacity: false, usagePercent: 100 },
    } as never)
    expect(warning).toContain("active-member limit")
  })

  test("prioritizes access and billing warnings before capacity guidance", () => {
    expect(
      getSubscriptionWarning({
        status: "suspended",
        usage: { isAtCapacity: true, isOverCapacity: true, usagePercent: 120 },
      } as never)
    ).toContain("suspended")
    expect(
      getSubscriptionWarning({
        status: "grace",
        usage: { isAtCapacity: false, isOverCapacity: false, usagePercent: 40 },
      } as never)
    ).toContain("Billing needs attention")
    expect(
      getSubscriptionWarning({
        status: "active",
        usage: { isAtCapacity: true, isOverCapacity: true, usagePercent: 110 },
      } as never)
    ).toContain("above the plan limit")
    expect(
      getSubscriptionWarning({
        status: "active",
        usage: { isAtCapacity: false, isOverCapacity: false, usagePercent: 80 },
      } as never)
    ).toContain("80%")
  })
})
