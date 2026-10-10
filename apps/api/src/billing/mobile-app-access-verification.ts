import {
  acknowledgeGoogleSubscription,
  appleClients,
  googleAuth,
  googleRequest,
  purchaseTokenDigest,
  storeEnvironment,
} from "./store-verification"
import {
  appleMobileAppEvidence,
  googleMobileAppEvidence,
  parseMobileAppCatalog,
  type MobileAppProduct,
} from "./mobile-app-access-policy"
import { parseStoreCatalog } from "./store-policy"

function personalCatalog() {
  const products = parseMobileAppCatalog(process.env.MOBILE_APP_BILLING_CATALOG)
  const legacy = parseStoreCatalog(process.env.STORE_BILLING_CATALOG)
  if (
    products.some((product) =>
      legacy.some(
        (candidate) =>
          candidate.store === product.store &&
          candidate.productId === product.productId
      )
    )
  )
    throw new Error("Personal and historical store catalogs overlap")
  return products
}

export function configuredMobileAppCatalog(store: "apple" | "google") {
  try {
    storeEnvironment()
    if (store === "apple") appleClients()
    else googleAuth()
    return personalCatalog().filter((product) => product.store === store)
  } catch {
    return [] as MobileAppProduct[]
  }
}

export async function verifyAppleMobileAppAccess(transactionId: string) {
  const verifiedAt = new Date()
  const { client, verifier } = appleClients()
  const lookup = await client.getTransactionInfo(transactionId)
  if (!lookup.signedTransactionInfo)
    throw new Error("Missing Apple transaction")
  const original = await verifier.verifyAndDecodeTransaction(
    lookup.signedTransactionInfo
  )
  if (!original.originalTransactionId)
    throw new Error("Missing Apple subscription identity")
  const status = await client.getAllSubscriptionStatuses(
    original.originalTransactionId
  )
  const candidates =
    status.data
      ?.flatMap((group) => group.lastTransactions ?? [])
      .filter(
        (item) => item.originalTransactionId === original.originalTransactionId
      ) ?? []
  if (candidates.length !== 1)
    throw new Error("Ambiguous Apple subscription status")
  const item = candidates[0]!
  if (!item.signedTransactionInfo || !item.signedRenewalInfo || !item.status)
    throw new Error("Incomplete Apple subscription status")
  const transaction = await verifier.verifyAndDecodeTransaction(
    item.signedTransactionInfo
  )
  const renewal = await verifier.verifyAndDecodeRenewalInfo(
    item.signedRenewalInfo
  )
  if (
    transaction.originalTransactionId !== original.originalTransactionId ||
    renewal.originalTransactionId !== original.originalTransactionId
  )
    throw new Error("Apple subscription mismatch")
  return appleMobileAppEvidence({
    transaction,
    renewal,
    status: item.status,
    catalog: personalCatalog(),
    environment: storeEnvironment(),
    verifiedAt,
  })
}

export async function verifyAppleMobileAppNotification(signedPayload: string) {
  const { verifier } = appleClients()
  const notification = await verifier.verifyAndDecodeNotification(signedPayload)
  if (!notification.notificationUUID)
    throw new Error("Missing Apple event identity")
  if (notification.notificationType === "TEST") return null
  const signed = notification.data?.signedTransactionInfo
  if (!signed) throw new Error("Missing Apple notification transaction")
  const transaction = await verifier.verifyAndDecodeTransaction(signed)
  if (!transaction.transactionId)
    throw new Error("Missing Apple notification transaction identity")
  return verifyAppleMobileAppAccess(transaction.transactionId)
}

export async function verifyGoogleMobileAppAccess(token: string) {
  const verifiedAt = new Date()
  const response = await googleRequest(
    `purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`
  )
  return googleMobileAppEvidence({
    purchase: await response.json(),
    tokenDigest: purchaseTokenDigest(token),
    digest: purchaseTokenDigest,
    catalog: personalCatalog(),
    environment: storeEnvironment(),
    verifiedAt,
  })
}

export { acknowledgeGoogleSubscription, personalCatalog, storeEnvironment }
