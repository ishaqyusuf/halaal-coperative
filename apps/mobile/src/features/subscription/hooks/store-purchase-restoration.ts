import type { Purchase } from "expo-iap"

type RestorablePurchaseStore = {
  restorePurchases(): Promise<void>
  getAvailablePurchases(): Promise<Purchase[]>
}

export async function getRestorablePurchases(
  sdk: RestorablePurchaseStore,
  store: "apple" | "google"
) {
  // StoreKit needs its restore/sync phase before a new installation can query
  // the user's available transactions. Android restores through the query.
  if (store === "apple") await sdk.restorePurchases()
  return sdk.getAvailablePurchases()
}

export function purchaseBelongsToAccount(purchase: Purchase, binding: string) {
  return purchase.store === "apple"
    ? "appAccountToken" in purchase &&
        purchase.appAccountToken?.toLowerCase() === binding.toLowerCase()
    : "obfuscatedAccountIdAndroid" in purchase &&
        purchase.obfuscatedAccountIdAndroid?.toLowerCase() ===
          binding.toLowerCase()
}

export function classifyRestoredPurchases(
  purchases: Purchase[],
  binding: string
) {
  const matching = purchases.filter((purchase) =>
    purchaseBelongsToAccount(purchase, binding)
  )
  return {
    matching,
    otherAccountPurchasesFound: purchases.some(
      (purchase) => !purchaseBelongsToAccount(purchase, binding)
    ),
  }
}

export async function verifyRestoredPurchases<T>(
  purchases: readonly T[],
  verify: (purchase: T) => Promise<void>,
  needsReview: () => boolean
) {
  let unresolved = false
  for (const purchase of purchases) {
    try {
      await verify(purchase)
    } catch {
      unresolved = true
    }
    // A later applied purchase must not clear review of an earlier one.
    unresolved ||= needsReview()
  }
  return { needsReview: unresolved }
}

export function classifyGoogleOfferPurchase(
  purchases: Purchase[],
  binding: string,
  targetProductId: string,
  configuredProductIds: ReadonlySet<string>
):
  | { kind: "new" | "restore" | "review" }
  | { kind: "replace"; prior: Purchase } {
  if (
    purchases.some(
      (purchase) =>
        purchase.store === "google" &&
        !purchaseBelongsToAccount(purchase, binding)
    )
  )
    return { kind: "review" }
  const owned = purchases.filter(
    (purchase) =>
      purchase.store === "google" && purchaseBelongsToAccount(purchase, binding)
  )
  if (!owned.length) return { kind: "new" }
  if (owned.length !== 1) return { kind: "review" }
  const prior = owned[0]
  if (
    !prior ||
    prior.store !== "google" ||
    prior.purchaseState !== "purchased" ||
    ("isSuspendedAndroid" in prior && prior.isSuspendedAndroid) ||
    ("pendingPurchaseUpdateAndroid" in prior &&
      prior.pendingPurchaseUpdateAndroid) ||
    !prior.purchaseToken ||
    !configuredProductIds.has(prior.productId)
  )
    return { kind: "review" }
  if (prior.productId === targetProductId) return { kind: "restore" }
  return { kind: "replace", prior }
}
