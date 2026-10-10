import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { z } from "zod"
import {
  applyVerifiedMobileAppAccess,
  applyVerifiedStoreEntitlement,
} from "@halaalvest/db"
import type { StoreEntitlement } from "./store-policy"
import { LegacyCatalogMismatchError } from "./store-policy"
import type { MobileAppEvidence } from "./mobile-app-access-policy"
import {
  personalCatalog,
  verifyAppleMobileAppNotification,
  verifyGoogleMobileAppAccess,
} from "./mobile-app-access-verification"
import { recordPendingRefundReview } from "./store-refund-review"
import {
  acknowledgeGoogleSubscription,
  verifyAppleNotification,
  verifyGoogleNotificationIdentity,
  verifyGoogleSubscription,
} from "./store-verification"

type StoreNotificationDependencies = {
  verifyAppleNotification: (payload: string) => Promise<StoreEntitlement | null>
  verifyGoogleNotificationIdentity: (
    authorization: string | undefined
  ) => Promise<void>
  verifyGoogleSubscription: typeof verifyGoogleSubscription
  verifyAppleMobileAppNotification: (
    payload: string
  ) => Promise<MobileAppEvidence | null>
  verifyGoogleMobileAppAccess: typeof verifyGoogleMobileAppAccess
  applyVerifiedMobileAppAccess: (input: {
    evidence: MobileAppEvidence
  }) => Promise<{ applied: boolean }>
  applyVerifiedStoreEntitlement: (input: {
    evidence: StoreEntitlement
  }) => Promise<{ applied: boolean }>
  acknowledgeGoogleSubscription: typeof acknowledgeGoogleSubscription
  recordPendingRefundReview: typeof recordPendingRefundReview
}
const productionDependencies: StoreNotificationDependencies = {
  verifyAppleNotification,
  verifyGoogleNotificationIdentity,
  verifyGoogleSubscription,
  verifyAppleMobileAppNotification,
  verifyGoogleMobileAppAccess,
  applyVerifiedMobileAppAccess,
  applyVerifiedStoreEntitlement,
  acknowledgeGoogleSubscription,
  recordPendingRefundReview,
}
const googleNotificationSchema = z
  .object({
    version: z.literal("1.0"),
    packageName: z.literal("com.halaalvest.mobile"),
    eventTimeMillis: z.union([
      z.string().regex(/^\d{13}$/),
      z.number().int().min(1_000_000_000_000).max(9_999_999_999_999),
    ]),
    testNotification: z.object({ version: z.literal("1.0") }).optional(),
    subscriptionNotification: z
      .object({
        version: z.literal("1.0"),
        notificationType: z.number().int().positive(),
        purchaseToken: z.string().min(1).max(8192),
      })
      .optional(),
    voidedPurchaseNotification: z
      .object({
        purchaseToken: z.string().min(1).max(8192),
        orderId: z.string().min(1),
        productType: z.union([z.literal(1), z.literal(2)]),
      })
      .optional(),
    oneTimeProductNotification: z.unknown().optional(),
    pendingRefundReviewNotification: z
      .object({
        version: z.literal("1.0"),
        pendingRefundToken: z.string().min(1).max(8192),
        orderId: z.string().min(1).max(256),
        refundReason: z.number().int().positive(),
        obfuscatedAccountId: z.string().min(1).max(128).optional(),
        obfuscatedProfileId: z.string().min(1).max(128).optional(),
      })
      .optional(),
  })
  // Unknown top-level fields may be future event kinds; do not strip and ack them.
  .strict()
  .refine(
    (value) =>
      [
        value.testNotification,
        value.subscriptionNotification,
        value.voidedPurchaseNotification,
        value.oneTimeProductNotification,
        value.pendingRefundReviewNotification,
      ].filter((part) => part !== undefined).length === 1,
    "Google notification must contain exactly one supported event"
  )

export function createStoreNotifications(
  overrides: Partial<StoreNotificationDependencies> = {}
) {
  const dependencies = { ...productionDependencies, ...overrides }
  const notifications = new Hono()
  notifications.use("*", bodyLimit({ maxSize: 256 * 1024 }))
  notifications.post("/apple", async (c) => {
    const body = z
      .object({ signedPayload: z.string().min(1).max(240_000) })
      .safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ accepted: false }, 400)
    try {
      personalCatalog()
      try {
        const evidence = await dependencies.verifyAppleNotification(
          body.data.signedPayload
        )
        if (evidence)
          await dependencies.applyVerifiedStoreEntitlement({ evidence })
      } catch (error) {
        if (!(error instanceof LegacyCatalogMismatchError)) throw error
        const evidence = await dependencies.verifyAppleMobileAppNotification(
          body.data.signedPayload
        )
        if (evidence)
          await dependencies.applyVerifiedMobileAppAccess({ evidence })
      }
      return c.json({ accepted: true })
    } catch {
      return c.json({ accepted: false }, 503)
    }
  })
  notifications.post("/google", async (c) => {
    try {
      await dependencies.verifyGoogleNotificationIdentity(
        c.req.header("authorization")
      )
    } catch {
      return c.json({ accepted: false }, 401)
    }
    const envelope = z
      .object({
        message: z.object({
          data: z.string().min(1).max(64_000),
          messageId: z.string().min(1),
        }),
      })
      .safeParse(await c.req.json().catch(() => null))
    if (!envelope.success) return c.json({ accepted: false }, 400)
    try {
      personalCatalog()
      const notification = googleNotificationSchema.parse(
        JSON.parse(
          Buffer.from(envelope.data.message.data, "base64").toString("utf8")
        )
      )
      if (notification.testNotification) return c.json({ accepted: true })
      if (notification.pendingRefundReviewNotification) {
        const review = notification.pendingRefundReviewNotification
        await dependencies.recordPendingRefundReview({
          event: {
            pendingRefundToken: review.pendingRefundToken,
            orderId: review.orderId,
            refundReason: review.refundReason,
            obfuscatedAccountId: review.obfuscatedAccountId,
            obfuscatedProfileId: review.obfuscatedProfileId,
          },
          receivedAt: new Date(),
          occurredAt: new Date(Number(notification.eventTimeMillis)),
        })
        // A durable receipt is not a reviewed chargeback response. Retry until
        // a staffed response path and dead-letter monitoring are operational.
        return c.json({ accepted: false }, 503)
      }
      if (notification.voidedPurchaseNotification?.productType === 2)
        return c.json({ accepted: false }, 400)
      const token =
        notification.subscriptionNotification?.purchaseToken ??
        notification.voidedPurchaseNotification?.purchaseToken
      if (!token) return c.json({ accepted: false }, 400)
      try {
        const result = await dependencies.verifyGoogleSubscription(token)
        const applied = await dependencies.applyVerifiedStoreEntitlement({
          evidence: result.entitlement,
        })
        if (result.acknowledgementRequired && !applied.applied)
          return c.json({ accepted: false }, 503)
        if (result.acknowledgementRequired)
          await dependencies.acknowledgeGoogleSubscription(
            result.entitlement.productId,
            token
          )
      } catch (error) {
        if (!(error instanceof LegacyCatalogMismatchError)) throw error
        const result = await dependencies.verifyGoogleMobileAppAccess(token)
        const applied = await dependencies.applyVerifiedMobileAppAccess({
          evidence: result.evidence,
        })
        if (result.acknowledgementRequired && !applied.applied)
          return c.json({ accepted: false }, 503)
        if (result.acknowledgementRequired)
          await dependencies.acknowledgeGoogleSubscription(
            result.evidence.productId,
            token
          )
      }
      return c.json({ accepted: true })
    } catch {
      return c.json({ accepted: false }, 503)
    }
  })
  return notifications
}

export const storeNotifications = createStoreNotifications()
