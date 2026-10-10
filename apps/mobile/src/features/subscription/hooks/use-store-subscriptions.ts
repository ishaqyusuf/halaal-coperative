import { useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import Constants from "expo-constants"
import type { ProductSubscription, Purchase } from "expo-iap"
import { getToken } from "@/lib/session-store"
import { isStorePurchaseBindingCurrent } from "@/lib/mobile-subscription-policy"
import {
  getStoreCatalog,
  verifyStorePurchase,
  type StoreCatalog,
  type StoreProductMapping,
} from "../api/store-subscription-api"
import {
  classifyGoogleOfferPurchase,
  classifyRestoredPurchases,
  getRestorablePurchases,
  purchaseBelongsToAccount,
  verifyRestoredPurchases,
} from "./store-purchase-restoration"
import { loadStoreProducts } from "./store-product-loading"
import { createStorePurchaseEventGuard } from "./store-purchase-event-guard"
import { createStorePurchaseCallbackWatchdog } from "./store-purchase-callback-watchdog"
import { createStorePurchaseBusyReleaseGate } from "./store-purchase-busy-release"
import { shouldFinishNativeStoreTransaction } from "./store-transaction-finalization"
import { storeManagementLinkOptions } from "./store-management-link"
import { purchaseReviewAfterVerification } from "./store-purchase-review"

type NativeStore = typeof import("expo-iap")
// The native module owns one process-wide connection. A new account scope waits
// for the previous effect to finish initialization and disconnect completely.
let connectionTail: Promise<void> = Promise.resolve()
export type StoreOffer = {
  mapping: StoreProductMapping
  product: ProductSubscription
  displayPrice: string
  offerToken?: string
}
export function useStoreSubscriptions({
  enabled,
  scope,
  onVerified,
}: {
  enabled: boolean
  scope: string
  onVerified: () => Promise<boolean>
}) {
  const [offers, setOffers] = useState<StoreOffer[]>([])
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [purchaseNeedsReview, setPurchaseNeedsReview] = useState(false)
  const purchaseNeedsReviewRef = useRef(false)
  const requirePurchaseReview = (required: boolean) => {
    purchaseNeedsReviewRef.current = required
    setPurchaseNeedsReview(required)
  }
  const state = useRef<{
    sdk: NativeStore
    catalog: StoreCatalog
    availableOffers: StoreOffer[]
    token: string | null
    scope: string
    verify: (purchase: Purchase) => Promise<void>
    watchdog: ReturnType<typeof createStorePurchaseCallbackWatchdog>
    busyReleaseGate: ReturnType<typeof createStorePurchaseBusyReleaseGate>
    hasVerificationInFlight: () => boolean
  } | null>(null)
  const onVerifiedRef = useRef(onVerified)
  onVerifiedRef.current = onVerified
  const busyRef = useRef(false)
  useEffect(() => {
    let active = true
    let sdk: NativeStore | null = null
    let releaseConnection: (() => void) | undefined
    const listeners: { remove: () => void }[] = []
    const purchaseGuard = createStorePurchaseEventGuard()
    const busyReleaseGate = createStorePurchaseBusyReleaseGate()
    const watchdog = createStorePurchaseCallbackWatchdog(() => {
      if (!current()) return
      if (
        busyReleaseGate.canRelease(
          purchaseGuard.hasInFlight(),
          watchdog.pending()
        )
      ) {
        busyRef.current = false
        setBusy(false)
      }
      requirePurchaseReview(true)
      setMessage(
        "The store did not confirm this purchase. Use Restore purchases before trying again; do not buy again yet."
      )
    })
    const inFlightPurchases = new Map<string, Promise<void>>()
    const token = getToken()
    const store =
      Platform.OS === "ios"
        ? "apple"
        : Platform.OS === "android"
          ? "google"
          : null
    state.current = null
    setReady(false)
    setOffers([])
    setMessage(null)
    setBusy(false)
    busyRef.current = false
    const current = () => active && token === getToken()
    if (!enabled || !store)
      return () => {
        active = false
        watchdog.cancel()
      }
    async function connect() {
      try {
        const catalog = await getStoreCatalog(store!)
        if (!current()) return
        if (!catalog.accountBinding) {
          setMessage(
            "Store subscriptions are unavailable for this cooperative. Your existing cooperative access is unchanged."
          )
          return
        }
        const previousConnection = connectionTail
        connectionTail = new Promise<void>((resolve) => {
          releaseConnection = resolve
        })
        await previousConnection
        if (!current()) return
        sdk = await import("expo-iap")
        if (!current()) return
        const verify = async (
          purchase: Purchase,
          restoring: boolean
        ): Promise<boolean> => {
          if (
            !current() ||
            !sdk ||
            !catalog.accountBinding ||
            purchase.store !== store
          )
            return false
          if (!purchaseBelongsToAccount(purchase, catalog.accountBinding)) {
            requirePurchaseReview(true)
            setMessage(
              "This store purchase could not be matched to this cooperative. Switch to its cooperative and restore, or contact support. Do not buy again."
            )
            return false
          }
          if (purchase.purchaseState !== "purchased") {
            requirePurchaseReview(true)
            setMessage(
              "The store payment is pending. Access changes after store confirmation."
            )
            return false
          }
          let verification: Awaited<ReturnType<typeof verifyStorePurchase>>
          if (purchase.store === "apple")
            verification = await verifyStorePurchase({
              store: "apple",
              transactionId: purchase.id,
            })
          else {
            if (!purchase.purchaseToken)
              throw new Error("Missing purchase token")
            verification = await verifyStorePurchase({
              store: "google",
              purchaseToken: purchase.purchaseToken,
            })
          }
          if (!verification.verified)
            throw new Error("Store purchase verification was not confirmed")
          if (!current()) return false
          if (
            shouldFinishNativeStoreTransaction(
              purchase.store,
              verification.applied
            )
          )
            await sdk.finishTransaction({ purchase, isConsumable: false })
          if (!current()) return false
          try {
            const refreshed = await onVerifiedRef.current()
            if (!current()) return verification.applied
            requirePurchaseReview(
              purchaseReviewAfterVerification(
                purchaseNeedsReviewRef.current,
                verification.applied,
                restoring
              )
            )
            setMessage(
              verification.applied && purchaseNeedsReviewRef.current
                ? "Store purchase verified, but purchase review is still required. Use Restore purchases before buying again."
                : !refreshed
                  ? verification.applied
                    ? "Store purchase verified. Refresh plan details to see the latest access."
                    : "Store purchase verified, but plan details could not be refreshed. Contact billing support if your plan remains unchanged."
                  : verification.applied
                    ? "Store purchase verified. Your cooperative plan is refreshed."
                    : "Store purchase verified, but your cooperative plan did not change. Contact billing support if this is unexpected."
            )
          } catch {
            if (!current()) return verification.applied
            requirePurchaseReview(
              purchaseReviewAfterVerification(
                purchaseNeedsReviewRef.current,
                verification.applied,
                restoring
              )
            )
            setMessage(
              verification.applied && purchaseNeedsReviewRef.current
                ? "Store purchase verified, but purchase review is still required. Use Restore purchases before buying again."
                : verification.applied
                  ? "Store purchase verified. Refresh plan details to see the latest access."
                  : "Store purchase verified, but plan details could not be refreshed. Contact billing support if your plan remains unchanged."
            )
          }
          return verification.applied
        }
        const processPurchase = (
          purchase: Purchase,
          restoring = false
        ): Promise<void> => {
          const key = `${purchase.store}:${purchase.id || purchase.purchaseToken || purchase.productId}`
          const existing = inFlightPurchases.get(key)
          if (existing) return existing
          if (!purchaseGuard.begin(key)) return Promise.resolve()
          busyRef.current = true
          setBusy(true)
          const processing = verify(purchase, restoring)
            .then((applied) => {
              if (applied) purchaseGuard.applied(key)
            })
            .finally(() => {
              purchaseGuard.done(key)
              inFlightPurchases.delete(key)
            })
          inFlightPurchases.set(key, processing)
          return processing
        }
        listeners.push(
          sdk.purchaseUpdatedListener((purchase) => {
            watchdog.observed(purchase.productId)
            void processPurchase(purchase)
              .catch(() => {
                if (current()) {
                  requirePurchaseReview(true)
                  setMessage(
                    "Purchase verification is pending. Use Restore purchases to retry; do not buy again."
                  )
                }
              })
              .finally(() => {
                if (
                  current() &&
                  busyReleaseGate.canRelease(
                    purchaseGuard.hasInFlight(),
                    watchdog.pending()
                  )
                ) {
                  busyRef.current = false
                  setBusy(false)
                }
              })
          })
        )
        listeners.push(
          sdk.purchaseErrorListener((error) => {
            if (purchaseGuard.ignorePurchaseError(error.code)) return
            if (!watchdog.observedError(error.productId, error.productIds))
              return
            if (current()) {
              requirePurchaseReview(error.code !== "user-cancelled")
              if (
                busyReleaseGate.canRelease(
                  purchaseGuard.hasInFlight(),
                  watchdog.pending()
                )
              ) {
                busyRef.current = false
                setBusy(false)
              }
              setMessage(
                error.code === "user-cancelled"
                  ? "Purchase cancelled."
                  : "The store could not confirm the purchase. Restore purchases before trying again."
              )
            }
          })
        )
        await sdk.initConnection()
        if (!current()) return
        const { products, lookupFailed } = await loadStoreProducts(
          catalog.products.map((product) => product.productId),
          (productIds) => sdk!.fetchProducts({ skus: productIds, type: "subs" })
        )
        if (!current()) return
        const resolved: StoreOffer[] = []
        for (const product of products ?? []) {
          if (product.type !== "subs") continue
          const mapping = catalog.products.find(
            (p) => p.store === store && p.productId === product.id
          )
          if (!mapping) continue
          if (product.platform === "ios") {
            if (
              product.subscriptionPeriodUnitIOS !== "month" ||
              product.subscriptionPeriodNumberIOS !== "1"
            )
              continue
            resolved.push({
              mapping,
              product,
              displayPrice: `${product.displayPrice} / month`,
            })
          } else {
            const offer = product.subscriptionOffers.find(
              (o) =>
                o.basePlanIdAndroid === mapping.basePlanId &&
                !o.installmentPlanDetailsAndroid &&
                o.pricingPhasesAndroid?.pricingPhaseList.length === 1 &&
                o.pricingPhasesAndroid.pricingPhaseList[0]?.billingPeriod ===
                  "P1M" &&
                o.pricingPhasesAndroid.pricingPhaseList[0]?.recurrenceMode === 1
            )
            if (!offer?.offerTokenAndroid) continue
            resolved.push({
              mapping,
              product,
              displayPrice: `${offer.pricingPhasesAndroid!.pricingPhaseList[0]!.formattedPrice} / month`,
              offerToken: offer.offerTokenAndroid,
            })
          }
        }
        state.current = {
          sdk,
          catalog,
          availableOffers: resolved,
          token,
          scope,
          verify: (purchase) => processPurchase(purchase, true),
          watchdog,
          busyReleaseGate,
          hasVerificationInFlight: purchaseGuard.hasInFlight,
        }
        setOffers(resolved)
        setReady(true)
        if (!resolved.length)
          setMessage(
            lookupFailed
              ? "New plans could not be loaded from the store. You can still restore or manage an existing purchase."
              : catalog.products.length
                ? "No configured monthly plans are available from this store account. You can still restore an existing purchase."
                : "New subscriptions are not available yet. You can still restore or manage an existing purchase."
          )
      } catch {
        if (current())
          setMessage(
            "The store is unavailable. Check your connection and use a supported store-installed build."
          )
      }
    }
    const connecting = connect()
    return () => {
      active = false
      watchdog.cancel()
      state.current = null
      listeners.forEach((listener) => listener.remove())
      // initConnection may still be in flight. Disconnecting before it settles
      // can reopen a leaked connection after this effect has been disposed.
      void connecting.finally(async () => {
        try {
          if (sdk) await sdk.endConnection()
        } catch {
          /* A disconnected store needs no further cleanup. */
        } finally {
          releaseConnection?.()
        }
      })
    }
  }, [enabled, scope, reload])
  function currentState() {
    const value = state.current
    if (
      !enabled ||
      !value ||
      value.scope !== scope ||
      value.token !== getToken() ||
      busyRef.current
    )
      return null
    return value
  }
  async function purchase(
    offer: StoreOffer,
    reviewedSubscriptionId: string | null
  ) {
    const value = currentState()
    if (
      !value ||
      !value.catalog.accountBinding ||
      !isStorePurchaseBindingCurrent(
        value.catalog.accountBinding,
        reviewedSubscriptionId
      ) ||
      !value.availableOffers.includes(offer) ||
      purchaseNeedsReviewRef.current
    )
      return
    const accountBinding = value.catalog.accountBinding
    busyRef.current = true
    setBusy(true)
    setMessage(null)
    const requestGeneration = value.watchdog.begin(offer.product.id)
    try {
      if (Platform.OS === "ios") {
        await value.sdk.requestPurchase({
          type: "subs",
          request: {
            apple: {
              sku: offer.product.id,
              appAccountToken: accountBinding,
              andDangerouslyFinishTransactionAutomatically: false,
            },
          },
        })
      } else {
        if (!offer.offerToken) throw new Error("Store offer unavailable")
        const existing = classifyGoogleOfferPurchase(
          await value.sdk.getAvailablePurchases(),
          accountBinding,
          offer.product.id,
          new Set(
            value.catalog.products
              .filter((product) => product.store === "google")
              .map((product) => product.productId)
          )
        )
        if (value.token !== getToken() || state.current !== value)
          throw new Error("Refresh store purchases")
        if (existing.kind === "restore" || existing.kind === "review") {
          value.watchdog.observed()
          if (
            value.busyReleaseGate.canRelease(
              value.hasVerificationInFlight(),
              value.watchdog.pending()
            )
          ) {
            busyRef.current = false
            setBusy(false)
          }
          requirePurchaseReview(true)
          setMessage(
            existing.kind === "restore"
              ? "This store account already has that plan. Use Restore purchases to refresh its access; do not buy again."
              : "An existing store purchase needs review. Use Restore purchases before trying a plan change."
          )
          return
        }
        const prior = existing.kind === "replace" ? existing.prior : null
        await value.sdk.requestPurchase({
          type: "subs",
          request: {
            google: {
              skus: [offer.product.id],
              obfuscatedAccountId: accountBinding,
              subscriptionOffers: [
                { sku: offer.product.id, offerToken: offer.offerToken },
              ],
              ...(prior?.purchaseToken && prior.productId !== offer.product.id
                ? {
                    purchaseToken: prior.purchaseToken,
                    subscriptionProductReplacementParams: {
                      oldProductId: prior.productId,
                      replacementMode: "deferred" as const,
                    },
                  }
                : {}),
            },
          },
        })
      }
      if (state.current === value) value.watchdog.dispatched(requestGeneration)
    } catch {
      value.watchdog.observed()
      if (state.current === value) {
        if (
          value.busyReleaseGate.canRelease(
            value.hasVerificationInFlight(),
            value.watchdog.pending()
          )
        ) {
          busyRef.current = false
          setBusy(false)
        }
        requirePurchaseReview(true)
        setMessage(
          "Purchase could not start. Restore purchases before trying again."
        )
      }
    }
  }
  async function restore() {
    const value = currentState()
    if (!value?.catalog.accountBinding) return
    value.busyReleaseGate.beginRestore()
    busyRef.current = true
    setBusy(true)
    try {
      const purchases = await getRestorablePurchases(
        value.sdk,
        Platform.OS === "ios" ? "apple" : "google"
      )
      const { matching, otherAccountPurchasesFound } =
        classifyRestoredPurchases(purchases, value.catalog.accountBinding)
      const result = await verifyRestoredPurchases(
        matching,
        value.verify,
        () => purchaseNeedsReviewRef.current
      )
      if (state.current === value && matching.length === 0) {
        requirePurchaseReview(otherAccountPurchasesFound)
        setMessage(
          purchases.length
            ? "Store purchases were found, but none could be matched to this cooperative. Switch to the cooperative that purchased the plan and restore, or contact support. Do not buy again."
            : "No purchases for this cooperative were found in the current store account."
        )
      } else if (
        state.current === value &&
        (result.needsReview || otherAccountPurchasesFound)
      ) {
        requirePurchaseReview(true)
        setMessage(
          otherAccountPurchasesFound
            ? "Some store purchases could not be matched to this cooperative. Switch to the cooperative that purchased them and restore, or contact billing support. Do not buy again."
            : "Some store purchases still need review. Refresh plan details and contact billing support before buying again."
        )
      }
    } catch {
      if (state.current === value) {
        requirePurchaseReview(true)
        setMessage(
          "Restore could not finish. Check your store account and connection, then retry."
        )
      }
    } finally {
      value.busyReleaseGate.endRestore()
      if (state.current === value) {
        if (
          value.busyReleaseGate.canRelease(
            value.hasVerificationInFlight(),
            value.watchdog.pending()
          )
        ) {
          busyRef.current = false
          setBusy(false)
        }
      }
    }
  }
  async function manage() {
    const value = currentState()
    if (!value) return
    try {
      await value.sdk.deepLinkToSubscriptions(
        storeManagementLinkOptions(
          Platform.OS,
          Constants.expoConfig?.android?.package
        )
      )
    } catch {
      if (state.current === value)
        setMessage(
          "Open your app store’s Subscriptions settings to manage or cancel this plan."
        )
    }
  }
  return {
    offers,
    busy,
    purchaseNeedsReview,
    ready,
    message,
    purchase,
    restore,
    manage,
    reconnect: () => setReload((n) => n + 1),
  }
}
