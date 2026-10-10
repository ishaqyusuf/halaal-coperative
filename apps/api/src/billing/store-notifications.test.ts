import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import {
  createStoreNotifications,
  storeNotifications,
} from "./store-notifications"
import type { StoreEntitlement } from "./store-policy"
import { LegacyCatalogMismatchError } from "./store-policy"
import type { MobileAppEvidence } from "./mobile-app-access-policy"
import type { recordPendingRefundReview } from "./store-refund-review"

const evidence: StoreEntitlement = {
  accountBinding: "ff53e47b-d995-45a2-bbf6-79abb5750ccd",
  productId: "starter-monthly",
  planCode: "starter",
  providerName: "google_play",
  providerSubscriptionId: "provider-id",
  periodStartsAt: new Date("2026-09-01T00:00:00.000Z"),
  periodEndsAt: new Date("2026-10-01T00:00:00.000Z"),
  graceEndsAt: null,
  status: "active",
  cancelAtPeriodEnd: false,
  verifiedAt: new Date("2026-09-28T00:00:00.000Z"),
  environment: "sandbox",
}
const personalEvidence: MobileAppEvidence = {
  userBinding: "ff53e47b-d995-45a2-bbf6-79abb5750ccd",
  providerName: "google_play",
  providerSubscriptionId: "personal-digest",
  productId: "halaalvest.app.access",
  duration: "six_months",
  periodStartsAt: null,
  periodEndsAt: new Date("2027-03-28T00:00:00Z"),
  graceEndsAt: null,
  status: "active",
  cancelAtPeriodEnd: false,
  verifiedAt: new Date("2026-09-28T00:00:00Z"),
  environment: "sandbox",
}

function googleEnvelopeData(data: Record<string, unknown>) {
  return JSON.stringify({
    message: {
      messageId: "test-message-1",
      data: Buffer.from(
        JSON.stringify({
          version: "1.0",
          packageName: "com.halaalvest.mobile",
          eventTimeMillis: "1790591124000",
          ...data,
        })
      ).toString("base64"),
    },
  })
}
function googleEnvelope(token: string) {
  return googleEnvelopeData({
    subscriptionNotification: {
      version: "1.0",
      notificationType: 4,
      purchaseToken: token,
    },
  })
}

describe("store notification HTTP boundary", () => {
  test("routes a personal Apple notification to user access, without changing the tenant plan", async () => {
    const steps: string[] = []
    const notifications = createStoreNotifications({
      verifyAppleNotification: async () => {
        throw new LegacyCatalogMismatchError()
      },
      verifyAppleMobileAppNotification: async () => {
        steps.push("personal-verify")
        return { ...personalEvidence, providerName: "apple_app_store" }
      },
      applyVerifiedMobileAppAccess: async () => {
        steps.push("personal-apply")
        return { applied: true }
      },
      applyVerifiedStoreEntitlement: async () => {
        steps.push("tenant-apply")
        return { applied: true }
      },
    })
    const response = await notifications.request("/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedPayload: "signed-personal" }),
    })
    expect(response.status).toBe(200)
    expect(steps).toEqual(["personal-verify", "personal-apply"])
  })

  test("routes personal Play renewal to user access and withholds acknowledgment until applied", async () => {
    for (const applied of [false, true]) {
      const steps: string[] = []
      const notifications = createStoreNotifications({
        verifyGoogleNotificationIdentity: async () => {},
        verifyGoogleSubscription: async () => {
          throw new LegacyCatalogMismatchError()
        },
        verifyGoogleMobileAppAccess: async () => {
          steps.push("personal-verify")
          return { evidence: personalEvidence, acknowledgementRequired: true }
        },
        applyVerifiedMobileAppAccess: async () => {
          steps.push("personal-apply")
          return { applied }
        },
        applyVerifiedStoreEntitlement: async () => {
          steps.push("tenant-apply")
          return { applied: true }
        },
        acknowledgeGoogleSubscription: async () => {
          steps.push("acknowledge")
        },
      })
      const response = await notifications.request("/google", {
        method: "POST",
        headers: { Authorization: "Bearer signed-push" },
        body: googleEnvelope("personal-token"),
      })
      expect(response.status).toBe(applied ? 200 : 503)
      expect(steps).toEqual(
        applied
          ? ["personal-verify", "personal-apply", "acknowledge"]
          : ["personal-verify", "personal-apply"]
      )
    }
  })
  test("persists verified Apple evidence and accepts a signed test notification without a grant", async () => {
    const steps: string[] = []
    const notifications = createStoreNotifications({
      verifyAppleNotification: async (payload) => {
        steps.push(`verify:${payload}`)
        return payload === "signed-test"
          ? null
          : {
              ...evidence,
              providerName: "apple_app_store",
            }
      },
      applyVerifiedStoreEntitlement: async ({ evidence: verified }) => {
        steps.push(`apply:${verified.providerName}`)
        return { applied: true }
      },
    })
    for (const signedPayload of ["signed-test", "signed-subscription"]) {
      const response = await notifications.request("/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedPayload }),
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ accepted: true })
    }
    expect(steps).toEqual([
      "verify:signed-test",
      "verify:signed-subscription",
      "apply:apple_app_store",
    ])
  })

  test("authenticates Google push, re-verifies current state, persists it, then acknowledges", async () => {
    const steps: string[] = []
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async (authorization) => {
        expect(authorization).toBe("Bearer signed-push")
        steps.push("authenticate")
      },
      verifyGoogleSubscription: async (token) => {
        expect(token).toBe("store-token")
        steps.push("verify-current")
        return { entitlement: evidence, acknowledgementRequired: true }
      },
      applyVerifiedStoreEntitlement: async ({ evidence: verified }) => {
        expect(verified).toEqual(evidence)
        steps.push("persist")
        return { applied: true }
      },
      acknowledgeGoogleSubscription: async (productId, token) => {
        expect([productId, token]).toEqual(["starter-monthly", "store-token"])
        steps.push("acknowledge")
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer signed-push",
      },
      body: googleEnvelope("store-token"),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: true })
    expect(steps).toEqual([
      "authenticate",
      "verify-current",
      "persist",
      "acknowledge",
    ])
  })

  test("does not acknowledge Google when entitlement persistence fails", async () => {
    let acknowledged = false
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async () => ({
        entitlement: evidence,
        acknowledgementRequired: true,
      }),
      applyVerifiedStoreEntitlement: async () => {
        throw new Error("Database unavailable")
      },
      acknowledgeGoogleSubscription: async () => {
        acknowledged = true
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: googleEnvelope("store-token"),
    })
    expect(response.status).toBe(503)
    expect(acknowledged).toBe(false)
  })

  test("re-verifies a conflicted Google notice on redelivery before acknowledging", async () => {
    const steps: string[] = []
    let verificationCount = 0
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {
        steps.push("authenticate")
      },
      verifyGoogleSubscription: async () => {
        verificationCount += 1
        steps.push(`verify:${verificationCount}`)
        return {
          entitlement: {
            ...evidence,
            verifiedAt: new Date(
              evidence.verifiedAt.getTime() + verificationCount
            ),
          },
          acknowledgementRequired: true,
        }
      },
      applyVerifiedStoreEntitlement: async ({ evidence: verified }) => {
        steps.push(`apply:${verified.verifiedAt.getTime()}`)
        if (verificationCount === 1)
          throw new AppError({
            code: "CONFLICT",
            publicMessage: "Retry current store state.",
          })
        return { applied: true }
      },
      acknowledgeGoogleSubscription: async () => {
        steps.push("acknowledge")
      },
    })
    const request = () =>
      notifications.request("/google", {
        method: "POST",
        body: googleEnvelope("store-token"),
      })

    const first = await request()
    expect(first.status).toBe(503)
    expect(steps).not.toContain("acknowledge")

    const redelivery = await request()
    expect(redelivery.status).toBe(200)
    expect(steps).toEqual([
      "authenticate",
      "verify:1",
      `apply:${evidence.verifiedAt.getTime() + 1}`,
      "authenticate",
      "verify:2",
      `apply:${evidence.verifiedAt.getTime() + 2}`,
      "acknowledge",
    ])
  })

  test("retries a Google purchase that still needs acknowledgement when no entitlement was applied", async () => {
    let acknowledged = false
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async () => ({
        entitlement: evidence,
        acknowledgementRequired: true,
      }),
      applyVerifiedStoreEntitlement: async () => ({ applied: false }),
      acknowledgeGoogleSubscription: async () => {
        acknowledged = true
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelope("store-token"),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ accepted: false })
    expect(acknowledged).toBe(false)
  })

  test("re-verifies a voided subscription purchase before updating access", async () => {
    const steps: string[] = []
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async (token) => {
        steps.push(`verify:${token}`)
        return {
          entitlement: { ...evidence, status: "suspended" },
          acknowledgementRequired: false,
        }
      },
      applyVerifiedStoreEntitlement: async ({ evidence: verified }) => {
        steps.push(`apply:${verified.status}`)
        return { applied: true }
      },
      acknowledgeGoogleSubscription: async () => {
        steps.push("acknowledge")
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelopeData({
        voidedPurchaseNotification: {
          purchaseToken: "voided-token",
          orderId: "GPA.1234-5678",
          productType: 1,
          refundType: 1,
        },
      }),
    })
    expect(response.status).toBe(200)
    expect(steps).toEqual(["verify:voided-token", "apply:suspended"])
  })

  test("accepts an authenticated Play test notification without a subscription lookup", async () => {
    let lookedUp = false
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async () => {
        lookedUp = true
        return { entitlement: evidence, acknowledgementRequired: false }
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelopeData({ testNotification: { version: "1.0" } }),
    })
    expect(response.status).toBe(200)
    expect(lookedUp).toBe(false)
  })

  test("durably records a pending refund review but keeps the push retryable", async () => {
    const steps: string[] = []
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {
        steps.push("authenticate")
      },
      verifyGoogleSubscription: async () => {
        steps.push("subscription-lookup")
        return { entitlement: evidence, acknowledgementRequired: false }
      },
      recordPendingRefundReview: async ({ event, occurredAt, receivedAt }) => {
        expect(event).toEqual({
          pendingRefundToken: "review-token",
          orderId: "GPA.1234-5678",
          refundReason: 7,
          obfuscatedAccountId: evidence.accountBinding,
        })
        expect(occurredAt.toISOString()).toBe("2026-09-28T10:25:24.000Z")
        expect(receivedAt).toBeInstanceOf(Date)
        steps.push("persist-review")
        return {} as Awaited<ReturnType<typeof recordPendingRefundReview>>
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelopeData({
        eventTimeMillis: 1790591124000,
        pendingRefundReviewNotification: {
          version: "1.0",
          pendingRefundToken: "review-token",
          orderId: "GPA.1234-5678",
          refundReason: 7,
          obfuscatedAccountId: evidence.accountBinding,
        },
      }),
    })
    expect(response.status).toBe(503)
    expect(steps).toEqual(["authenticate", "persist-review"])
  })

  test("does not accept a pending refund review when its receipt fails", async () => {
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      recordPendingRefundReview: async () => {
        throw new Error("Database unavailable")
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelopeData({
        pendingRefundReviewNotification: {
          version: "1.0",
          pendingRefundToken: "review-token",
          orderId: "GPA.1234-5678",
          refundReason: 7,
        },
      }),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ accepted: false })
  })

  test("retains an unfamiliar positive refund reason for human review", async () => {
    let receivedReason: number | null = null
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      recordPendingRefundReview: async ({ event }) => {
        receivedReason = event.refundReason
        return {} as Awaited<ReturnType<typeof recordPendingRefundReview>>
      },
    })
    const response = await notifications.request("/google", {
      method: "POST",
      body: googleEnvelopeData({
        pendingRefundReviewNotification: {
          version: "1.0",
          pendingRefundToken: "review-token",
          orderId: "GPA.1234-5678",
          refundReason: 8,
        },
      }),
    })
    expect(response.status).toBe(503)
    expect(receivedReason).toBe(8)
  })

  test("keeps unsupported RTDN versions, event keys and incomplete notices retryable", async () => {
    let providerCalls = 0
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async () => {
        providerCalls += 1
        return { entitlement: evidence, acknowledgementRequired: false }
      },
      recordPendingRefundReview: async () => {
        providerCalls += 1
        return {} as Awaited<ReturnType<typeof recordPendingRefundReview>>
      },
    })
    const unsupported = [
      { version: "2.0", testNotification: { version: "1.0" } },
      {
        subscriptionNotification: {
          version: "2.0",
          notificationType: 4,
          purchaseToken: "store-token",
        },
      },
      {
        subscriptionNotification: {
          version: "1.0",
          purchaseToken: "store-token",
        },
      },
      {
        pendingRefundReviewNotification: {
          version: "2.0",
          pendingRefundToken: "review-token",
          orderId: "GPA.1234-5678",
          refundReason: 7,
        },
      },
      {
        subscriptionNotification: {
          version: "1.0",
          notificationType: 4,
          purchaseToken: "store-token",
        },
        unfamiliarNotification: { purchaseToken: "other-token" },
      },
    ]
    for (const notice of unsupported) {
      const response = await notifications.request("/google", {
        method: "POST",
        body: googleEnvelopeData(notice),
      })
      expect(response.status).toBe(503)
    }
    expect(providerCalls).toBe(0)
  })

  test("rejects conflicting event kinds and one-time voids before provider lookup", async () => {
    let lookedUp = false
    const notifications = createStoreNotifications({
      verifyGoogleNotificationIdentity: async () => {},
      verifyGoogleSubscription: async () => {
        lookedUp = true
        return { entitlement: evidence, acknowledgementRequired: false }
      },
    })
    for (const payload of [
      {
        testNotification: { version: "1.0" },
        subscriptionNotification: {
          version: "1.0",
          notificationType: 4,
          purchaseToken: "store-token",
        },
      },
      {
        voidedPurchaseNotification: {
          purchaseToken: "one-time-token",
          orderId: "GPA.1234-5678",
          productType: 2,
        },
      },
    ]) {
      const response = await notifications.request("/google", {
        method: "POST",
        body: googleEnvelopeData(payload),
      })
      expect(response.status).not.toBe(200)
    }
    expect(lookedUp).toBe(false)
  })

  test("rejects unauthenticated Google push before reading the message", async () => {
    const response = await storeNotifications.request("/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { data: "not-base64", messageId: "test-1" },
      }),
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ accepted: false })
  })

  test("rejects oversized notification bodies before provider verification", async () => {
    const body = JSON.stringify({ signedPayload: "x".repeat(256 * 1024) })
    const withLength = await storeNotifications.request("/apple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(body)),
      },
      body,
    })
    const streamed = await storeNotifications.request("/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })

    expect(withLength.status).toBe(413)
    expect(streamed.status).toBe(413)
  })

  test("rejects malformed Apple notifications before provider verification", async () => {
    const response = await storeNotifications.request("/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedPayload: "" }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ accepted: false })
  })
})
