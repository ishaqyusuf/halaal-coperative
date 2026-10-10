import { describe, expect, test } from "bun:test"
import {
  appleMobileAppEvidence,
  completeFirstReleaseMobileAppCatalog,
  googleMobileAppEvidence,
  parseMobileAppCatalog,
} from "./mobile-app-access-policy"

const binding = "11111111-1111-4111-8111-111111111111"
const now = new Date("2026-09-28T00:00:00Z")
const catalog = parseMobileAppCatalog(
  JSON.stringify([
    {
      store: "apple",
      productId: "halaalvest.app.sixmonth",
      duration: "six_months",
    },
    {
      store: "apple",
      productId: "halaalvest.app.annual",
      duration: "annual",
    },
    {
      store: "google",
      productId: "halaalvest.app.access",
      basePlanId: "six-month",
      duration: "six_months",
    },
    {
      store: "google",
      productId: "halaalvest.app.access",
      basePlanId: "annual",
      duration: "annual",
    },
  ])
)

const apple = {
  catalog,
  verifiedAt: now,
  environment: "production" as const,
  status: 1,
  transaction: {
    appAccountToken: binding,
    productId: "halaalvest.app.sixmonth",
    originalTransactionId: "123",
    purchaseDate: Date.parse("2026-03-28"),
    expiresDate: Date.parse("2026-09-29"),
    type: "Auto-Renewable Subscription",
    inAppOwnershipType: "PURCHASED",
  },
  renewal: { autoRenewStatus: 1 },
}

const google = {
  catalog,
  verifiedAt: now,
  environment: "production" as const,
  tokenDigest: "token-digest",
  digest: (value: string) => `digest:${value}`,
  purchase: {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    startTime: "2026-03-28T00:00:00Z",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    externalAccountIdentifiers: { obfuscatedExternalAccountId: binding },
    lineItems: [
      {
        productId: "halaalvest.app.access",
        expiryTime: "2026-09-29T00:00:00Z",
        offerDetails: { basePlanId: "six-month" },
        autoRenewingPlan: { autoRenewEnabled: true },
      },
    ],
  },
}

describe("personal mobile app catalog", () => {
  test("maps two equal-access durations on each store without tenant plan codes", () => {
    expect(catalog).toHaveLength(4)
    expect(catalog.map((product) => product.duration)).toEqual([
      "six_months",
      "annual",
      "six_months",
      "annual",
    ])
    expect(completeFirstReleaseMobileAppCatalog(catalog)).toBe(true)
    expect(completeFirstReleaseMobileAppCatalog(catalog.slice(1))).toBe(false)
    expect(completeFirstReleaseMobileAppCatalog([])).toBe(false)
    expect(() =>
      parseMobileAppCatalog(JSON.stringify([...catalog, catalog[0]]))
    ).toThrow()
    expect(() =>
      parseMobileAppCatalog(
        JSON.stringify([
          ...catalog.slice(0, 3),
          { ...catalog[3], productId: "a-second-google-product" },
        ])
      )
    ).toThrow("Google durations must use one subscription product")
    expect(() =>
      parseMobileAppCatalog(
        JSON.stringify([
          { store: "google", productId: "app", duration: "annual" },
        ])
      )
    ).toThrow()
  })

  test("requires an individual Apple binding and an unrevoked current period", () => {
    expect(appleMobileAppEvidence(apple).userBinding).toBe(binding)
    expect(appleMobileAppEvidence(apple).duration).toBe("six_months")
    expect(() =>
      appleMobileAppEvidence({
        ...apple,
        transaction: { ...apple.transaction, appAccountToken: undefined },
      })
    ).toThrow()
    expect(
      appleMobileAppEvidence({
        ...apple,
        transaction: { ...apple.transaction, revocationDate: now.getTime() },
      }).status
    ).toBe("suspended")
    expect(
      appleMobileAppEvidence({
        ...apple,
        verifiedAt: new Date("2026-10-01"),
      }).status
    ).toBe("suspended")
  })

  test("maps a Google base plan and acknowledges only current applied candidates", () => {
    const verified = googleMobileAppEvidence(google)
    expect(verified.evidence.userBinding).toBe(binding)
    expect(verified.evidence.duration).toBe("six_months")
    expect(verified.evidence.cancelAtPeriodEnd).toBe(false)
    expect(verified.acknowledgementRequired).toBe(true)
    expect(
      googleMobileAppEvidence({
        ...google,
        purchase: {
          ...google.purchase,
          subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD",
        },
      }).evidence.status
    ).toBe("suspended")
    expect(() =>
      googleMobileAppEvidence({
        ...google,
        purchase: {
          ...google.purchase,
          externalAccountIdentifiers: {},
        },
      })
    ).toThrow()
  })

  test("rejects ambiguous or foreign duration changes", () => {
    const current = {
      ...google.purchase.lineItems[0]!,
      autoRenewingPlan: { autoRenewEnabled: false },
      deferredItemReplacement: { productId: "halaalvest.app.access" },
    }
    const next = {
      productId: "halaalvest.app.access",
      offerDetails: { basePlanId: "annual" },
    }
    const verified = googleMobileAppEvidence({
      ...google,
      purchase: {
        ...google.purchase,
        linkedPurchaseToken: "old-token",
        lineItems: [current, next],
      },
    })
    expect(verified.evidence.duration).toBe("six_months")
    expect(verified.evidence.cancelAtPeriodEnd).toBe(false)
    expect(verified.evidence.previousProviderSubscriptionId).toBe(
      "digest:old-token"
    )
    expect(() =>
      googleMobileAppEvidence({
        ...google,
        purchase: {
          ...google.purchase,
          lineItems: [current, { ...next, productId: "foreign" }],
        },
      })
    ).toThrow()
    expect(() =>
      googleMobileAppEvidence({
        ...google,
        purchase: {
          ...google.purchase,
          lineItems: [current, { ...next, expiryTime: "2026-10-01T00:00:00Z" }],
        },
      })
    ).toThrow()
  })
})
