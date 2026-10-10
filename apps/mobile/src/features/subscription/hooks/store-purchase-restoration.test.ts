import { describe, expect, it } from "bun:test"
import type { Purchase } from "expo-iap"
import {
  classifyGoogleOfferPurchase,
  classifyRestoredPurchases,
  getRestorablePurchases,
  verifyRestoredPurchases,
} from "./store-purchase-restoration"

function accountPurchase(
  store: "apple" | "google",
  accountBinding: string | null
): Purchase {
  return {
    store,
    id: `${store}-purchase`,
    productId: "monthly-plan",
    purchaseState: "purchased",
    ...(store === "apple"
      ? { appAccountToken: accountBinding }
      : { obfuscatedAccountIdAndroid: accountBinding }),
  } as Purchase
}

describe("store purchase restoration", () => {
  it("continues after one receipt fails verification and keeps review required", async () => {
    const attempted: string[] = []
    const result = await verifyRestoredPurchases(
      ["failed", "applied"],
      async (receipt) => {
        attempted.push(receipt)
        if (receipt === "failed") throw new Error("verification unavailable")
      },
      () => false
    )
    expect(attempted).toEqual(["failed", "applied"])
    expect(result).toEqual({ needsReview: true })
  })

  it("keeps the earlier applied receipt when a later receipt fails", async () => {
    const attempted: string[] = []
    const result = await verifyRestoredPurchases(
      ["applied", "failed"],
      async (receipt) => {
        attempted.push(receipt)
        if (receipt === "failed") throw new Error("verification unavailable")
      },
      () => false
    )
    expect(attempted).toEqual(["applied", "failed"])
    expect(result).toEqual({ needsReview: true })
  })

  it("retains an unsettled receipt's review need after a later receipt applies", async () => {
    let review = false
    const result = await verifyRestoredPurchases(
      ["pending", "applied"],
      async (receipt) => {
        review = receipt === "pending"
      },
      () => review
    )
    expect(review).toBe(false)
    expect(result).toEqual({ needsReview: true })
  })

  it("clears review after every restored receipt applies", async () => {
    let review = true
    const result = await verifyRestoredPurchases(
      ["applied"],
      async () => {
        review = false
      },
      () => review
    )
    expect(result).toEqual({ needsReview: false })
  })

  it("synchronizes StoreKit before querying transactions", async () => {
    const steps: string[] = []
    const sdk = {
      async restorePurchases() {
        steps.push("sync")
      },
      async getAvailablePurchases() {
        steps.push("query")
        return []
      },
    }
    await getRestorablePurchases(sdk, "apple")
    expect(steps).toEqual(["sync", "query"])
  })

  it("does not show an empty restore result after StoreKit sync fails", async () => {
    let queried = false
    const sdk = {
      async restorePurchases() {
        throw new Error("StoreKit sync failed")
      },
      async getAvailablePurchases() {
        queried = true
        return []
      },
    }
    await expect(getRestorablePurchases(sdk, "apple")).rejects.toThrow(
      "StoreKit sync failed"
    )
    expect(queried).toBe(false)
  })

  it("queries Google purchases without an iOS restore call", async () => {
    const steps: string[] = []
    const sdk = {
      async restorePurchases() {
        steps.push("sync")
      },
      async getAvailablePurchases() {
        steps.push("query")
        return []
      },
    }
    await getRestorablePurchases(sdk, "google")
    expect(steps).toEqual(["query"])
  })

  it("blocks another purchase after Restore finds only a different cooperative's transaction", () => {
    for (const store of ["apple", "google"] as const) {
      const result = classifyRestoredPurchases(
        [accountPurchase(store, "other-binding")],
        "current-binding"
      )
      expect(result.matching).toEqual([])
      expect(result.otherAccountPurchasesFound).toBe(true)
    }
  })

  it("flags an unmatched receipt even alongside an applicable same-cooperative receipt", () => {
    for (const store of ["apple", "google"] as const) {
      const result = classifyRestoredPurchases(
        [
          accountPurchase(store, "current-binding"),
          accountPurchase(store, "other-binding"),
        ],
        "current-binding"
      )
      expect(result.matching).toHaveLength(1)
      expect(result.otherAccountPurchasesFound).toBe(true)
    }
  })

  it("recognizes a matching binding without case sensitivity and keeps empty restore recoverable", () => {
    const result = classifyRestoredPurchases(
      [accountPurchase("apple", "CURRENT-BINDING")],
      "current-binding"
    )
    expect(result.matching).toHaveLength(1)
    expect(result.otherAccountPurchasesFound).toBe(false)
    expect(classifyRestoredPurchases([], "current-binding")).toEqual({
      matching: [],
      otherAccountPurchasesFound: false,
    })
  })

  it("does not match a purchase whose account binding is missing", () => {
    const result = classifyRestoredPurchases(
      [accountPurchase("google", null)],
      "current-binding"
    )
    expect(result.matching).toEqual([])
    expect(result.otherAccountPurchasesFound).toBe(true)
  })

  it("routes already-owned and unsettled Google plans to recovery before a new purchase", () => {
    const configuredProductIds = new Set(["starter-monthly", "growth-monthly"])
    const prior = {
      ...accountPurchase("google", "current-binding"),
      productId: "starter-monthly",
      purchaseToken: "prior-token",
    } as Purchase
    expect(
      classifyGoogleOfferPurchase(
        [],
        "current-binding",
        "growth-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "new" })
    expect(
      classifyGoogleOfferPurchase(
        [prior],
        "current-binding",
        "starter-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "restore" })
    expect(
      classifyGoogleOfferPurchase(
        [prior],
        "current-binding",
        "growth-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "replace", prior })
    expect(
      classifyGoogleOfferPurchase(
        [prior],
        "other-binding",
        "growth-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "review" })
    for (const unsettled of [
      { ...prior, purchaseState: "pending" },
      { ...prior, isSuspendedAndroid: true },
      {
        ...prior,
        pendingPurchaseUpdateAndroid: { productId: "growth-monthly" },
      },
      { ...prior, purchaseToken: null },
    ] as Purchase[]) {
      expect(
        classifyGoogleOfferPurchase(
          [unsettled],
          "current-binding",
          "growth-monthly",
          configuredProductIds
        )
      ).toEqual({ kind: "review" })
    }
    expect(
      classifyGoogleOfferPurchase(
        [prior, { ...prior, id: "second-purchase" } as Purchase],
        "current-binding",
        "growth-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "review" })
    expect(
      classifyGoogleOfferPurchase(
        [{ ...prior, productId: "retired-or-unknown-monthly" } as Purchase],
        "current-binding",
        "growth-monthly",
        configuredProductIds
      )
    ).toEqual({ kind: "review" })
  })
})
