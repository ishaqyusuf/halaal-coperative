import { describe, expect, it } from "bun:test"
import { appleEntitlement, googleEntitlement, parseStoreCatalog } from "./store-policy"
const binding = "11111111-1111-4111-8111-111111111111"
const now = new Date("2026-09-24T00:00:00Z")
const catalog = parseStoreCatalog(JSON.stringify([{ store: "apple", productId: "starter", planCode: "starter" }, { store: "google", productId: "starter", basePlanId: "monthly", planCode: "starter" }, { store: "google", productId: "growth", basePlanId: "monthly", planCode: "growth" }]))
const apple = {
  catalog, verifiedAt: now, environment: "production" as const, status: 1,
  transaction: { appAccountToken: binding, productId: "starter", originalTransactionId: "123", purchaseDate: Date.parse("2026-09-01"), expiresDate: Date.parse("2026-10-01"), type: "Auto-Renewable Subscription", inAppOwnershipType: "PURCHASED" },
  renewal: { autoRenewStatus: 1 },
}
const google = {
  catalog, verifiedAt: now, environment: "production" as const, tokenDigest: "digest", digest: (s: string) => `hash:${s}`,
  purchase: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", startTime: "2026-09-01T00:00:00Z", acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING", externalAccountIdentifiers: { obfuscatedExternalAccountId: binding }, lineItems: [{ productId: "starter", expiryTime: "2026-10-01T00:00:00Z", offerDetails: { basePlanId: "monthly" }, autoRenewingPlan: { autoRenewEnabled: true } }] },
}
describe("verified store evidence", () => {
  it("rejects ambiguous product mappings and missing base plans", () => {
    expect(() => parseStoreCatalog(JSON.stringify([{store:"google",productId:"a",planCode:"starter"}]))).toThrow()
    expect(() => parseStoreCatalog(JSON.stringify([...catalog, catalog[0]]))).toThrow()
    expect(parseStoreCatalog(undefined)).toEqual([])
  })
  it("never grants access from a revoked or expired Apple transaction", () => {
    expect(appleEntitlement(apple).status).toBe("active")
    expect(appleEntitlement({...apple, transaction:{...apple.transaction,revocationDate:now.getTime()}}).status).toBe("suspended")
    expect(appleEntitlement({...apple, verifiedAt:new Date("2026-11-01")}).status).toBe("suspended")
    expect(() => appleEntitlement({...apple,transaction:{...apple.transaction,appAccountToken:undefined}})).toThrow()
    expect(() => appleEntitlement({...apple,transaction:{...apple.transaction,inAppOwnershipType:"FAMILY_SHARED"}})).toThrow()
  })
  it("preserves paid access after cancellation, but not hold or expiry", () => {
    expect(googleEntitlement(google).acknowledgementRequired).toBe(true)
    expect(googleEntitlement({...google,purchase:{...google.purchase,subscriptionState:"SUBSCRIPTION_STATE_CANCELED"}}).entitlement.status).toBe("active")
    expect(googleEntitlement({...google,purchase:{...google.purchase,subscriptionState:"SUBSCRIPTION_STATE_ON_HOLD"}}).entitlement.status).toBe("suspended")
    expect(googleEntitlement({...google,verifiedAt:new Date("2026-11-01")}).entitlement.status).toBe("suspended")
  })
  it("rejects sandbox substitution, pending payments, and foreign products", () => {
    expect(() => googleEntitlement({...google,purchase:{...google.purchase,testPurchase:{}}})).toThrow()
    expect(() => googleEntitlement({...google,purchase:{...google.purchase,subscriptionState:"SUBSCRIPTION_STATE_PENDING"}})).toThrow()
    expect(() => googleEntitlement({...google,catalog:[]})).toThrow()
  })
  it("keeps the old tier while acknowledging a deferred Google replacement, then switches at renewal", () => {
    const oldItem = { ...google.purchase.lineItems[0]!, autoRenewingPlan: { autoRenewEnabled: false }, deferredItemReplacement: { productId: "growth" } }
    const newItem = { productId: "growth", offerDetails: { basePlanId: "monthly" } }
    const before = googleEntitlement({ ...google, purchase: { ...google.purchase, linkedPurchaseToken: "old-token", lineItems: [oldItem, newItem] } })
    expect(before.entitlement.planCode).toBe("starter")
    expect(before.entitlement.providerSubscriptionId).toBe("digest")
    expect(before.entitlement.previousProviderSubscriptionId).toBe("hash:old-token")
    expect(before.entitlement.cancelAtPeriodEnd).toBe(false)
    expect(before.acknowledgementRequired).toBe(true)

    const after = googleEntitlement({ ...google, verifiedAt: new Date("2026-10-02T00:00:00Z"), purchase: { ...google.purchase, linkedPurchaseToken: "old-token", lineItems: [{ ...oldItem, deferredItemReplacement: undefined }, { ...newItem, expiryTime: "2026-11-01T00:00:00Z", autoRenewingPlan: { autoRenewEnabled: true } }] } })
    expect(after.entitlement.planCode).toBe("growth")
    expect(after.entitlement.periodEndsAt.toISOString()).toBe("2026-11-01T00:00:00.000Z")
  })
  it("rejects ambiguous or unconfigured deferred Google items", () => {
    const oldItem = { ...google.purchase.lineItems[0]!, deferredItemReplacement: { productId: "growth" } }
    const future = { productId: "growth", offerDetails: { basePlanId: "monthly" }, autoRenewingPlan: { autoRenewEnabled: true } }
    expect(() => googleEntitlement({ ...google, purchase: { ...google.purchase, lineItems: [oldItem, { ...future, expiryTime: "2026-10-01T00:00:00Z" }] } })).toThrow()
    expect(() => googleEntitlement({ ...google, purchase: { ...google.purchase, lineItems: [google.purchase.lineItems[0], future] } })).toThrow()
    expect(() => googleEntitlement({ ...google, purchase: { ...google.purchase, lineItems: [oldItem, { ...future, productId: "unknown" }] } })).toThrow()
  })
})
