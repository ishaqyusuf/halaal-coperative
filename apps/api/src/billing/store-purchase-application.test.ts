import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import type { StoreEntitlement } from "./store-policy"
import { verifyAndApplyStorePurchase } from "./store-purchase-application"

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const actorUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
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

describe("server store purchase application", () => {
  test("acknowledges a Google purchase only after its entitlement was applied", async () => {
    const steps: string[] = []
    const result = await verifyAndApplyStorePurchase(
      { store: "google", purchaseToken: "purchase-token" },
      { tenantId, actorUserId },
      {
        verifyGoogleSubscription: async (token) => {
          expect(token).toBe("purchase-token")
          steps.push("verify")
          return { entitlement: evidence, acknowledgementRequired: true }
        },
        applyVerifiedStoreEntitlement: async (input) => {
          expect(input).toEqual({
            evidence,
            expectedTenantId: tenantId,
            actorUserId,
          })
          steps.push("apply")
          return {
            applied: true,
            tenantId,
            subscriptionId: evidence.accountBinding,
          }
        },
        acknowledgeGoogleSubscription: async (productId, token) => {
          expect([productId, token]).toEqual([
            "starter-monthly",
            "purchase-token",
          ])
          steps.push("acknowledge")
        },
      }
    )
    expect(result).toEqual({ verified: true, applied: true })
    expect(steps).toEqual(["verify", "apply", "acknowledge"])
  })

  test("does not acknowledge an unapplied Google purchase", async () => {
    const steps: string[] = []
    const result = await verifyAndApplyStorePurchase(
      { store: "google", purchaseToken: "purchase-token" },
      { tenantId, actorUserId },
      {
        verifyGoogleSubscription: async () => {
          steps.push("verify")
          return { entitlement: evidence, acknowledgementRequired: true }
        },
        applyVerifiedStoreEntitlement: async () => {
          steps.push("not-applied")
          return {
            applied: false,
            tenantId,
            subscriptionId: evidence.accountBinding,
          }
        },
        acknowledgeGoogleSubscription: async () => {
          steps.push("acknowledge")
        },
      }
    )
    expect(result).toEqual({ verified: true, applied: false })
    expect(steps).toEqual(["verify", "not-applied"])
  })

  test("re-verifies a conflicted Google purchase on a later request before acknowledging", async () => {
    const steps: string[] = []
    let verificationCount = 0
    const dependencies = {
      verifyGoogleSubscription: async (token: string) => {
        expect(token).toBe("purchase-token")
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
      applyVerifiedStoreEntitlement: async (input: {
        evidence: StoreEntitlement
        expectedTenantId?: string
        actorUserId?: string
      }) => {
        expect(input.expectedTenantId).toBe(tenantId)
        expect(input.actorUserId).toBe(actorUserId)
        steps.push(`apply:${input.evidence.verifiedAt.getTime()}`)
        if (verificationCount === 1)
          throw new AppError({
            code: "CONFLICT",
            publicMessage: "Retry current store state.",
          })
        return {
          applied: true,
          tenantId,
          subscriptionId: evidence.accountBinding,
        }
      },
      acknowledgeGoogleSubscription: async (
        productId: string,
        token: string
      ) => {
        expect([productId, token]).toEqual([
          "starter-monthly",
          "purchase-token",
        ])
        steps.push("acknowledge")
      },
    }
    const verify = () =>
      verifyAndApplyStorePurchase(
        { store: "google", purchaseToken: "purchase-token" },
        { tenantId, actorUserId },
        dependencies
      )

    await expect(verify()).rejects.toMatchObject({ code: "CONFLICT" })
    expect(steps).not.toContain("acknowledge")
    expect(await verify()).toEqual({ verified: true, applied: true })
    expect(steps).toEqual([
      "verify:1",
      `apply:${evidence.verifiedAt.getTime() + 1}`,
      "verify:2",
      `apply:${evidence.verifiedAt.getTime() + 2}`,
      "acknowledge",
    ])
  })

  test("applies verified Apple evidence without a Google acknowledgment", async () => {
    const steps: string[] = []
    const appleEvidence = {
      ...evidence,
      providerName: "apple_app_store" as const,
    }
    const result = await verifyAndApplyStorePurchase(
      { store: "apple", transactionId: "123456" },
      { tenantId, actorUserId },
      {
        verifyAppleSubscription: async (transactionId) => {
          expect(transactionId).toBe("123456")
          steps.push("verify-apple")
          return appleEvidence
        },
        applyVerifiedStoreEntitlement: async ({ evidence: applied }) => {
          expect(applied).toEqual(appleEvidence)
          steps.push("apply")
          return {
            applied: true,
            tenantId,
            subscriptionId: evidence.accountBinding,
          }
        },
        acknowledgeGoogleSubscription: async () => {
          steps.push("acknowledge-google")
        },
      }
    )
    expect(result).toEqual({ verified: true, applied: true })
    expect(steps).toEqual(["verify-apple", "apply"])
  })
})
