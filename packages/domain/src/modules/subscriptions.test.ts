import { describe, expect, test } from "bun:test"
import {
  createFailSafeSubscriptionSnapshot,
  resolveEffectiveSubscriptionStatus,
  resolveSubscriptionSnapshot,
  SUBSCRIPTION_PLAN_DEFINITIONS,
  SUBSCRIPTION_STATUSES,
} from "./subscriptions"

const now = new Date("2026-08-11T12:00:00.000Z")

describe("subscription policy", () => {
  test("matches approved capacity bands and separates every commercial category", () => {
    expect(SUBSCRIPTION_PLAN_DEFINITIONS.free_beta.activeMemberLimit).toBe(100)
    expect(SUBSCRIPTION_PLAN_DEFINITIONS.starter.activeMemberLimit).toBe(250)
    expect(SUBSCRIPTION_PLAN_DEFINITIONS.standard.activeMemberLimit).toBe(1000)
    expect(SUBSCRIPTION_PLAN_DEFINITIONS.growth.activeMemberLimit).toBe(3000)
    expect(
      SUBSCRIPTION_PLAN_DEFINITIONS.enterprise.activeMemberLimit
    ).toBeNull()

    const standard = SUBSCRIPTION_PLAN_DEFINITIONS.standard
    expect(standard.monthlyPrice).toEqual({
      billingCategory: "subscription_fee",
      billingInterval: "month",
      currencyCode: "NGN",
      maximum: 75000,
      minimum: 50000,
    })
    expect(standard.setupFee).toMatchObject({
      billingCategory: "setup_fee",
      billingInterval: "one_time",
      minimum: 150000,
    })
    expect(standard.addonDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          billingCategory: "separate_addon",
          code: "whatsapp_notifications",
        }),
      ])
    )
    expect(standard.passThroughCostDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          billingCategory: "provider_pass_through",
          code: "whatsapp_delivery",
        }),
      ])
    )
  })

  test("enforces capacity without disabling existing finance reads", () => {
    const snapshot = resolveSubscriptionSnapshot({
      activeAddonCodes: [],
      activeMemberCount: 1000,
      billingInfrastructureAvailable: true,
      now,
      planCode: "standard",
      source: "billing_provider",
      status: "active",
    })

    expect(snapshot.usage.isAtCapacity).toBe(true)
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(snapshot.enforcement.memberLoginEnabled).toBe(true)
    expect(snapshot.entitlements.coreFinance).toBe(true)
    expect(snapshot.enforcement.reason).toBe("active_member_capacity_reached")
  })

  test("flags over-cap tenants while preserving existing member access", () => {
    const snapshot = resolveSubscriptionSnapshot({
      activeAddonCodes: [],
      activeMemberCount: 1001,
      billingInfrastructureAvailable: true,
      now,
      planCode: "standard",
      source: "billing_provider",
      status: "active",
    })

    expect(snapshot.usage.isOverCapacity).toBe(true)
    expect(snapshot.usage.remainingActiveMembers).toBe(0)
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(snapshot.enforcement.memberLoginEnabled).toBe(true)
  })

  test("applies explicit add-ons without expanding core finance authority", () => {
    const snapshot = resolveSubscriptionSnapshot({
      activeAddonCodes: [
        "member_login",
        "custom_domain",
        "whatsapp_notifications",
      ],
      activeMemberCount: 20,
      billingInfrastructureAvailable: true,
      now,
      planCode: "starter",
      source: "manual",
      status: "manual",
    })

    expect(snapshot.entitlements.memberLogin).toBe(true)
    expect(snapshot.entitlements.customDomain).toBe(true)
    expect(snapshot.entitlements.whatsAppNotifications).toBe("addon_enabled")
    expect(snapshot.entitlements.coreFinance).toBe(true)
  })

  test("keeps every governed status explicit", () => {
    expect(SUBSCRIPTION_STATUSES).toEqual([
      "free_beta",
      "trialing",
      "active",
      "past_due",
      "grace",
      "cancelled",
      "suspended",
      "manual",
      "enterprise",
    ])
  })

  test("moves expired beta, trial, past-due, and grace states to the correct effective status", () => {
    const activeGraceEnd = new Date("2026-08-18T12:00:00.000Z")
    const expiredGraceEnd = new Date("2026-08-10T12:00:00.000Z")
    const expiredTrialEnd = new Date("2026-08-10T12:00:00.000Z")

    expect(
      resolveEffectiveSubscriptionStatus({
        graceEndsAt: activeGraceEnd,
        now,
        status: "free_beta",
        trialEndsAt: expiredTrialEnd,
      })
    ).toBe("grace")
    expect(
      resolveEffectiveSubscriptionStatus({
        graceEndsAt: expiredGraceEnd,
        now,
        status: "trialing",
        trialEndsAt: expiredTrialEnd,
      })
    ).toBe("suspended")
    expect(
      resolveEffectiveSubscriptionStatus({
        graceEndsAt: activeGraceEnd,
        now,
        status: "past_due",
        trialEndsAt: null,
      })
    ).toBe("grace")
    expect(
      resolveEffectiveSubscriptionStatus({
        graceEndsAt: expiredGraceEnd,
        now,
        status: "grace",
        trialEndsAt: null,
      })
    ).toBe("suspended")
  })

  test("keeps existing login during grace but blocks new member activation", () => {
    const snapshot = resolveSubscriptionSnapshot({
      activeAddonCodes: [],
      activeMemberCount: 100,
      billingInfrastructureAvailable: true,
      graceEndsAt: new Date("2026-08-18T12:00:00.000Z"),
      now,
      planCode: "standard",
      source: "billing_provider",
      status: "past_due",
    })

    expect(snapshot.status).toBe("grace")
    expect(snapshot.enforcement.accessEnabled).toBe(true)
    expect(snapshot.enforcement.memberLoginEnabled).toBe(true)
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(snapshot.enforcement.reason).toBe("subscription_grace_read_only")
  })

  test("keeps cancelled access through the paid period without allowing expansion", () => {
    const activeUntilEnd = resolveSubscriptionSnapshot({
      activeAddonCodes: [],
      activeMemberCount: 10,
      billingInfrastructureAvailable: true,
      currentPeriodEndsAt: new Date("2026-09-01T00:00:00.000Z"),
      now,
      planCode: "standard",
      source: "billing_provider",
      status: "cancelled",
    })
    expect(activeUntilEnd.enforcement.accessEnabled).toBe(true)
    expect(activeUntilEnd.enforcement.memberLoginEnabled).toBe(true)
    expect(activeUntilEnd.enforcement.canActivateMember).toBe(false)

    const ended = resolveSubscriptionSnapshot({
      activeAddonCodes: [],
      activeMemberCount: 10,
      billingInfrastructureAvailable: true,
      currentPeriodEndsAt: new Date("2026-08-01T00:00:00.000Z"),
      now,
      planCode: "standard",
      source: "billing_provider",
      status: "cancelled",
    })
    expect(ended.enforcement.accessEnabled).toBe(false)
    expect(ended.enforcement.memberLoginEnabled).toBe(false)
  })

  test("fails closed for expansion and member login when billing infrastructure is unavailable", () => {
    const snapshot = createFailSafeSubscriptionSnapshot({
      activeMemberCount: 20,
      now,
    })

    expect(snapshot.sourceState.fallbackApplied).toBe(true)
    expect(snapshot.entitlements.coreFinance).toBe(true)
    expect(snapshot.enforcement.accessEnabled).toBe(true)
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(snapshot.enforcement.memberLoginEnabled).toBe(false)
    expect(snapshot.enforcement.reason).toBe(
      "billing_infrastructure_unavailable"
    )
    expect(snapshot.source).toBe("system_default")
  })
})

 test("expires verified billing periods without waiting for a webhook", () => {
  const input = { now, status: "active" as const, source: "billing_provider" as const, currentPeriodEndsAt: new Date(now.getTime() - 1) }
  expect(resolveEffectiveSubscriptionStatus(input)).toBe("suspended")
  expect(resolveEffectiveSubscriptionStatus({ ...input, graceEndsAt: new Date(now.getTime() + 1000) })).toBe("grace")
  expect(resolveEffectiveSubscriptionStatus({ ...input, source: "manual" })).toBe("active")
 })
