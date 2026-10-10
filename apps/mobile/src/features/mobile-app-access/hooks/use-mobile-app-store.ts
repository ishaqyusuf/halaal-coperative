import { useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import Constants from "expo-constants"
import type { ProductSubscription, Purchase } from "expo-iap"
import { getToken } from "@/lib/session-store"
import {
  getRestorablePurchases,
  purchaseBelongsToAccount,
  createStorePurchaseBusyReleaseGate,
  loadStoreProducts,
  shouldFinishNativeStoreTransaction,
  storeManagementLinkOptions,
} from "@/features/subscription/public/native-store-policy"
import {
  getMobileAppCatalog,
  verifyMobileAppPurchase,
  type MobileAppCatalog,
} from "../api/mobile-app-access-api"
import {
  resolveMobileAppOffers,
  type MobileAppOffer,
} from "../model/mobile-app-offers"
import { createStorePurchaseVerificationFlight } from "./store-purchase-verification-flight"

type NativeStore = typeof import("expo-iap")
let connectionTail: Promise<void> = Promise.resolve()

export function useMobileAppStore(input: {
  enabled: boolean
  scope: string
  userId: string
  accessAllowed: boolean
  refreshAccess: () => Promise<boolean>
}) {
  const [offers, setOffers] = useState<MobileAppOffer[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [needsReview, setNeedsReview] = useState(false)
  const [reload, setReload] = useState(0)
  const busyRef = useRef(false)
  const callbackObserved = useRef(false)
  const purchaseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef = useRef(input.refreshAccess)
  refreshRef.current = input.refreshAccess
  const state = useRef<{
    sdk: NativeStore
    catalog: MobileAppCatalog
    store: "apple" | "google"
    token: string | null
    scope: string
    offers: MobileAppOffer[]
    verify: (purchase: Purchase) => Promise<boolean>
    busyReleaseGate: ReturnType<typeof createStorePurchaseBusyReleaseGate>
    releaseBusyIfIdle: () => void
  } | null>(null)

  useEffect(() => {
    let active = true
    let sdk: NativeStore | null = null
    let releaseConnection: (() => void) | undefined
    const listeners: { remove: () => void }[] = []
    const inFlight = new Set<string>()
    const busyReleaseGate = createStorePurchaseBusyReleaseGate()
    const verifyOnce = createStorePurchaseVerificationFlight<boolean>()
    const token = getToken()
    const store =
      Platform.OS === "ios"
        ? "apple"
        : Platform.OS === "android"
          ? "google"
          : null
    const current = () => active && token === getToken()
    const releaseBusyIfIdle = () => {
      if (current() && busyReleaseGate.canRelease(inFlight.size > 0, false)) {
        busyRef.current = false
        setBusy(false)
      }
    }
    state.current = null
    busyRef.current = false
    setBusy(false)
    setReady(false)
    setOffers([])
    setMessage(null)
    setNeedsReview(false)
    if (!input.enabled || !store || !token)
      return () => {
        active = false
      }

    async function connect() {
      try {
        const catalog = await getMobileAppCatalog(store!)
        if (!current()) return
        if (
          !catalog.userBinding ||
          catalog.userBinding.toLowerCase() !== input.userId.toLowerCase()
        ) {
          setNeedsReview(true)
          setMessage(
            "Your store account could not be bound to this login. Contact support."
          )
          return
        }
        const previous = connectionTail
        connectionTail = new Promise<void>((resolve) => {
          releaseConnection = resolve
        })
        await previous
        if (!current()) return
        sdk = await import("expo-iap")
        await sdk.initConnection()
        if (!current()) return
        const verify = async (purchase: Purchase): Promise<boolean> => {
          if (!current() || !sdk || purchase.store !== store) return false
          if (
            !catalog.userBinding ||
            !purchaseBelongsToAccount(purchase, catalog.userBinding)
          ) {
            setNeedsReview(true)
            setMessage(
              "This purchase belongs to another app login. Contact support before buying again."
            )
            return false
          }
          if (purchase.purchaseState !== "purchased") {
            setNeedsReview(true)
            setMessage(
              "The store payment is pending. Use Restore after it completes."
            )
            return false
          }
          const result =
            store === "apple"
              ? await verifyMobileAppPurchase({
                  store: "apple",
                  transactionId: purchase.id,
                })
              : await verifyMobileAppPurchase({
                  store: "google",
                  purchaseToken: purchase.purchaseToken ?? "",
                })
          if (!result.verified || !result.applied) {
            setNeedsReview(true)
            setMessage(
              "The purchase needs another store check. Use Restore or contact support."
            )
            return false
          }
          if (shouldFinishNativeStoreTransaction(store, result.applied))
            await sdk.finishTransaction({ purchase, isConsumable: false })
          const allowed = await refreshRef.current()
          if (current()) {
            setNeedsReview(!allowed)
            setMessage(
              allowed
                ? "Your app access is active."
                : "Purchase verified, but access could not be refreshed. Use Restore or contact support."
            )
          }
          return allowed
        }
        const verifyReceipt = (purchase: Purchase): Promise<boolean> => {
          if (!current()) return Promise.resolve(false)
          const identity =
            purchase.store === "apple" ? purchase.id : purchase.purchaseToken
          if (!identity) {
            setNeedsReview(true)
            setMessage(
              "The store receipt has no transaction identifier. Contact support before buying again."
            )
            return Promise.resolve(false)
          }
          return verifyOnce(`${purchase.store}:${identity}`, () =>
            verify(purchase)
          )
        }
        const process = async (purchase: Purchase) => {
          const key = `${purchase.store}:${purchase.id || purchase.purchaseToken}`
          if (inFlight.has(key)) return
          inFlight.add(key)
          busyRef.current = true
          setBusy(true)
          try {
            await verifyReceipt(purchase)
          } catch {
            if (current()) {
              setNeedsReview(true)
              setMessage(
                "Store verification is pending. Use Restore before buying again."
              )
            }
          } finally {
            inFlight.delete(key)
            releaseBusyIfIdle()
          }
        }
        listeners.push(
          sdk.purchaseUpdatedListener((purchase) => {
            callbackObserved.current = true
            if (purchaseTimeout.current) clearTimeout(purchaseTimeout.current)
            purchaseTimeout.current = null
            void process(purchase)
          }),
          sdk.purchaseErrorListener((error) => {
            callbackObserved.current = true
            if (purchaseTimeout.current) clearTimeout(purchaseTimeout.current)
            purchaseTimeout.current = null
            if (!current()) return
            setNeedsReview(error.code !== "user-cancelled")
            setMessage(
              error.code === "user-cancelled"
                ? "Purchase cancelled."
                : "The store could not confirm the purchase. Use Restore before trying again."
            )
            releaseBusyIfIdle()
          })
        )
        const { products, lookupFailed } = await loadStoreProducts(
          [...new Set(catalog.products.map((item) => item.productId))],
          (ids) => sdk!.fetchProducts({ skus: ids, type: "subs" })
        )
        if (!current()) return
        const resolved = resolveMobileAppOffers(
          catalog.products,
          products.filter(
            (product): product is ProductSubscription => product.type === "subs"
          ),
          store!
        )
        state.current = {
          sdk,
          catalog,
          store: store!,
          token,
          scope: input.scope,
          offers: resolved,
          verify: verifyReceipt,
          busyReleaseGate,
          releaseBusyIfIdle,
        }
        setOffers(resolved)
        setReady(true)
        if (!resolved.length)
          setMessage(
            lookupFailed
              ? "Store prices are unavailable. Restore and Manage remain available."
              : "New app subscriptions are unavailable. Restore and Manage remain available."
          )
      } catch {
        if (current())
          setMessage(
            "The store is unavailable. Check your connection and try again."
          )
      }
    }
    const connecting = connect()
    return () => {
      active = false
      if (purchaseTimeout.current) clearTimeout(purchaseTimeout.current)
      purchaseTimeout.current = null
      state.current = null
      listeners.forEach((listener) => listener.remove())
      void connecting.finally(async () => {
        try {
          if (sdk) await sdk.endConnection()
        } catch {
          /* already closed */
        } finally {
          releaseConnection?.()
        }
      })
    }
  }, [input.enabled, input.scope, input.userId, reload])

  function currentState() {
    const value = state.current
    if (
      !value ||
      value.scope !== input.scope ||
      value.token !== getToken() ||
      busyRef.current
    )
      return null
    return value
  }

  async function purchase(offer: MobileAppOffer) {
    const value = currentState()
    if (
      !value ||
      !value.offers.includes(offer) ||
      !value.catalog.userBinding ||
      input.accessAllowed ||
      needsReview
    )
      return
    busyRef.current = true
    setBusy(true)
    callbackObserved.current = false
    let dispatched = false
    try {
      const owned = await value.sdk.getAvailablePurchases()
      if (state.current !== value) return
      // A listener owns any store update that arrived during this read; do not
      // dispatch another charge or replace its verification result.
      if (callbackObserved.current) return
      if (
        owned.some((purchase) =>
          value.catalog.restorableProductIds.includes(purchase.productId)
        )
      ) {
        setNeedsReview(true)
        setMessage(
          "An app subscription is already in this store account. Restore it or use Manage to change duration; do not buy again."
        )
        return
      }
      if (value.store === "apple") {
        await value.sdk.requestPurchase({
          type: "subs",
          request: {
            apple: {
              sku: offer.product.id,
              appAccountToken: value.catalog.userBinding,
              andDangerouslyFinishTransactionAutomatically: false,
            },
          },
        })
      } else {
        if (!offer.offerToken) throw new Error("Missing Play offer token")
        await value.sdk.requestPurchase({
          type: "subs",
          request: {
            google: {
              skus: [offer.product.id],
              obfuscatedAccountId: value.catalog.userBinding,
              subscriptionOffers: [
                { sku: offer.product.id, offerToken: offer.offerToken },
              ],
            },
          },
        })
      }
      dispatched = true
      if (!callbackObserved.current) {
        purchaseTimeout.current = setTimeout(() => {
          if (state.current !== value || callbackObserved.current) return
          setNeedsReview(true)
          setMessage(
            "The store did not confirm this purchase. Use Restore before trying again; do not buy again yet."
          )
          busyRef.current = false
          setBusy(false)
        }, 10_000)
        if (state.current === value && !callbackObserved.current)
          setMessage(
            "Waiting for store confirmation. If it does not arrive, use Restore before buying again."
          )
      }
    } catch {
      if (state.current === value && !callbackObserved.current) {
        setNeedsReview(true)
        setMessage("Purchase could not start. Use Restore before trying again.")
      }
    } finally {
      if (state.current === value && !dispatched && !callbackObserved.current) {
        busyRef.current = false
        setBusy(false)
      }
    }
  }

  async function restore() {
    const value = currentState()
    if (!value?.catalog.userBinding) return
    busyRef.current = true
    setBusy(true)
    value.busyReleaseGate.beginRestore()
    try {
      const purchases = await getRestorablePurchases(value.sdk, value.store)
      if (state.current !== value) return
      const relevant = purchases.filter((purchase) =>
        value.catalog.restorableProductIds.includes(purchase.productId)
      )
      const matching = relevant.filter((purchase) =>
        purchaseBelongsToAccount(purchase, value.catalog.userBinding!)
      )
      if (matching.length !== relevant.length) {
        setNeedsReview(true)
        setMessage(
          "A store purchase belongs to another app login. Contact support before buying again."
        )
        return
      }
      if (!matching.length) {
        setMessage(
          "No personal app subscription was found in this store account."
        )
        return
      }
      let unresolved = false
      for (const purchase of matching) {
        try {
          const applied = await value.verify(purchase)
          unresolved ||= !applied
        } catch {
          unresolved = true
        }
      }
      if (unresolved && state.current === value) {
        setNeedsReview(true)
        setMessage(
          "A purchase still needs review. Contact support before buying again."
        )
      }
    } catch {
      if (state.current === value) {
        setNeedsReview(true)
        setMessage("Restore could not finish. Check your connection and retry.")
      }
    } finally {
      if (state.current === value) {
        value.busyReleaseGate.endRestore()
        value.releaseBusyIfIdle()
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
          "Open your app store’s Subscriptions settings to manage this plan."
        )
    }
  }

  return {
    offers,
    ready,
    busy,
    message,
    needsReview,
    purchase,
    restore,
    manage,
    reconnect: () => setReload((value) => value + 1),
  }
}
