import { describe, expect, test } from "bun:test"
import type {
  MobilePlanChangeIntent,
  MobileSubscriptionPlan,
  MobileSubscriptionSnapshot,
} from "@/lib/mobile-subscription-api"
import {
  getSubscriptionBrowsePresentation,
  getSubscriptionRecordedMessage,
  getSubscriptionRenewalMetric,
  presentSubscriptionPlanRow,
} from "./subscription-presentation"

const starterPlan = {
  activeMemberLimit: 250,
  addonDefinitions: [],
  availableAddonCodes: [],
  code: "starter",
  description: "Starter cooperative operations.",
  displayName: "Starter",
  entitlements: {
    auditDepth: "basic",
    coreFinance: true,
    customDomain: false,
    emailNotifications: "basic",
    memberLogin: false,
    memberStatements: "admin_only",
    reportDepth: "basic",
    roleDepth: "admin",
    whatsAppNotifications: "none",
    whiteLabel: "none",
  },
  isPublic: true,
  monthlyPrice: {
    billingCategory: "subscription_fee",
    billingInterval: "month",
    currencyCode: "NGN",
    maximum: 18_750,
    minimum: 12_500,
  },
  passThroughCostDefinitions: [],
  setupFee: {
    billingCategory: "setup_fee",
    billingInterval: "one_time",
    currencyCode: "NGN",
    maximum: 100_000,
    minimum: 50_000,
  },
  sortOrder: 2,
} satisfies MobileSubscriptionPlan

const standardPlan = {
  ...starterPlan,
  activeMemberLimit: 1_000,
  code: "standard",
  description: "Member and staff operations.",
  displayName: "Standard",
  monthlyPrice: {
    ...starterPlan.monthlyPrice,
    maximum: 75_000,
    minimum: 50_000,
  },
  sortOrder: 3,
} satisfies MobileSubscriptionPlan

function createSnapshot(
  overrides: Partial<MobileSubscriptionSnapshot> = {}
): MobileSubscriptionSnapshot {
  return {
    addons: [{ code: "member_login", status: "active" }],
    availablePlans: [starterPlan, standardPlan],
    billingPeriod: {
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: "2026-10-04T00:00:00.000Z",
      currentPeriodStartsAt: "2026-09-04T00:00:00.000Z",
      graceEndsAt: null,
      trialEndsAt: null,
      trialStartsAt: null,
    },
    enforcement: {
      accessEnabled: true,
      canActivateMember: true,
      memberLoginEnabled: true,
      reason: null,
    },
    entitlements: starterPlan.entitlements,
    invoices: [],
    plan: starterPlan,
    source: "billing_provider",
    sourceState: {
      billingInfrastructureAvailable: true,
      fallbackApplied: false,
    },
    status: "active",
    subscriptionId: "subscription-1",
    tenantId: "tenant-1",
    updatedAt: "2026-09-04T00:00:00.000Z",
    usage: {
      activeMemberCount: 2,
      activeMemberLimit: 250,
      isAtCapacity: false,
      isOverCapacity: false,
      remainingActiveMembers: 248,
      usagePercent: 0.8,
    },
    ...overrides,
  }
}

describe("subscription presentation", () => {
  test("builds the compact brand-band facts without routine freshness copy", () => {
    const presentation = getSubscriptionBrowsePresentation(createSnapshot())

    expect(presentation).toMatchObject({
      activeMembers: "2 active members",
      currentPlan: "Starter",
      remainingMembers: "248 spaces left",
      usagePercent: 0.8,
    })
    expect(presentation.metrics).toEqual([
      { label: "Renews", value: "4 Oct 2026" },
      { label: "Add-ons", value: "1" },
      { label: "Invoices", value: "0" },
    ])
    expect(JSON.stringify(presentation)).not.toContain("Updated")
  })

  test("uses truthful billing labels for trials and cancellations", () => {
    expect(
      getSubscriptionRenewalMetric(
        createSnapshot({
          status: "trialing",
          billingPeriod: {
            ...createSnapshot().billingPeriod,
            currentPeriodEndsAt: null,
            trialEndsAt: "2026-09-20T00:00:00.000Z",
          },
        })
      )
    ).toEqual({ label: "Trial ends", value: "20 Sep 2026" })

    expect(
      getSubscriptionRenewalMetric(
        createSnapshot({
          billingPeriod: {
            ...createSnapshot().billingPeriod,
            cancelAtPeriodEnd: true,
          },
        })
      )
    ).toEqual({ label: "Access until", value: "4 Oct 2026" })

    expect(
      getSubscriptionRenewalMetric(createSnapshot({ status: "suspended" }))
    ).toEqual({ label: "Plan status", value: "Suspended" })
    expect(
      getSubscriptionRenewalMetric(
        createSnapshot({
          status: "grace",
          billingPeriod: {
            ...createSnapshot().billingPeriod,
            graceEndsAt: "2026-10-10T00:00:00.000Z",
          },
        })
      )
    ).toEqual({ label: "Grace ends", value: "10 Oct 2026" })
    expect(
      getSubscriptionRenewalMetric(
        createSnapshot({ status: "active", source: "manual" })
      )
    ).toEqual({ label: "Current period ends", value: "4 Oct 2026" })
  })

  test("keeps plan rows concise and records a truthful pending message", () => {
    expect(presentSubscriptionPlanRow(standardPlan)).toEqual({
      capacity: "1,000 members",
      price: "₦50k–₦75k",
    })

    const intent = {
      checkoutAvailable: false,
      checkoutUrl: null,
      intentId: "intent-1",
      requestedPlanCode: "standard",
      status: "pending",
      supportMessage:
        "A verbose provider message that should not leak into UI.",
    } satisfies MobilePlanChangeIntent

    expect(getSubscriptionRecordedMessage(createSnapshot(), intent)).toBe(
      "Standard is pending billing review. Starter remains active."
    )
  })
})
