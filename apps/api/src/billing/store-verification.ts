import { createHash } from "node:crypto"
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library"
import { GoogleAuth, OAuth2Client } from "google-auth-library"
import { z } from "zod"
import { approvedIosReleaseIdentity } from "@halaalvest/domain/ios-release-identity"
import {
  appleEntitlement,
  googleEntitlement,
  parseStoreCatalog,
  type Store,
  type StoreEntitlement,
} from "./store-policy"

const packageName = "com.halaalvest.mobile"
export function storeEnvironment() {
  return z
    .enum(["production", "sandbox"])
    .parse(process.env.STORE_BILLING_ENVIRONMENT)
}
export function storeCatalog() {
  return parseStoreCatalog(process.env.STORE_BILLING_CATALOG)
}
function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error("Store billing configuration incomplete")
  return value
}
export function configuredStoreCatalog(store: Store) {
  try {
    storeEnvironment()
    if (store === "apple") appleClients()
    else googleAuth()
    return storeCatalog().filter((product) => product.store === store)
  } catch {
    return []
  }
}
export function appleClients() {
  const { bundleIdentifier, ascAppId } = approvedIosReleaseIdentity()
  const environment =
    storeEnvironment() === "production"
      ? Environment.PRODUCTION
      : Environment.SANDBOX
  const appAppleId = z.coerce
    .number()
    .int()
    .positive()
    .parse(required("APPLE_APP_ID"))
  if (String(appAppleId) !== ascAppId)
    throw new Error(
      "Apple app ID does not match the approved Zeroes Organization app."
    )
  const roots = z
    .array(z.string().min(1))
    .min(1)
    .parse(JSON.parse(required("APPLE_ROOT_CERTIFICATES_BASE64")))
    .map((value) => Buffer.from(value, "base64"))
  const verifier = new SignedDataVerifier(
    roots,
    true,
    environment,
    bundleIdentifier,
    appAppleId
  )
  const client = new AppStoreServerAPIClient(
    required("APPLE_IAP_PRIVATE_KEY").replace(/\\n/g, "\n"),
    required("APPLE_IAP_KEY_ID"),
    required("APPLE_IAP_ISSUER_ID"),
    bundleIdentifier,
    environment
  )
  return { client, verifier }
}
export function googleAuth() {
  const credentials = z
    .object({ client_email: z.email(), private_key: z.string().min(1) })
    .parse(JSON.parse(required("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")))
  return new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  })
}
export const purchaseTokenDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex")

export async function verifyAppleSubscription(
  transactionId: string
): Promise<StoreEntitlement> {
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
  // Always query current status; an authentic old transaction is not current entitlement.
  const current = await client.getAllSubscriptionStatuses(
    original.originalTransactionId
  )
  const candidates =
    current.data
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
  return appleEntitlement({
    transaction,
    renewal,
    status: item.status,
    catalog: storeCatalog(),
    environment: storeEnvironment(),
    verifiedAt,
  })
}

export async function googleRequest(path: string, method = "GET") {
  const auth = googleAuth()
  const accessToken = await auth.getAccessToken()
  if (!accessToken) throw new Error("Google store authentication unavailable")
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      ...(method === "POST" ? { body: "{}" } : {}),
      signal: AbortSignal.timeout(15_000),
    }
  )
  if (!response.ok) throw new Error("Google store verification unavailable")
  return response
}
export async function verifyGoogleSubscription(token: string) {
  const verifiedAt = new Date()
  const response = await googleRequest(
    `purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`
  )
  return googleEntitlement({
    purchase: await response.json(),
    tokenDigest: purchaseTokenDigest(token),
    digest: purchaseTokenDigest,
    catalog: storeCatalog(),
    verifiedAt,
    environment: storeEnvironment(),
  })
}
export async function acknowledgeGoogleSubscription(
  productId: string,
  token: string
) {
  await googleRequest(
    `purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,
    "POST"
  )
}
export async function verifyAppleNotification(signedPayload: string) {
  const { verifier } = appleClients()
  const notification = await verifier.verifyAndDecodeNotification(signedPayload)
  if (!notification.notificationUUID)
    throw new Error("Missing Apple event identity")
  if (notification.notificationType === "TEST") return null
  const signed = notification.data?.signedTransactionInfo
  if (!signed) throw new Error("Missing notification transaction")
  const transaction = await verifier.verifyAndDecodeTransaction(signed)
  if (!transaction.transactionId)
    throw new Error("Missing notification transaction identity")
  return verifyAppleSubscription(transaction.transactionId)
}
export async function verifyGoogleNotificationIdentity(
  authorization: string | undefined
) {
  const bearer = authorization?.match(/^Bearer ([^\s]+)$/)?.[1]
  if (!bearer) throw new Error("Notification authentication required")
  const ticket = await new OAuth2Client().verifyIdToken({
    idToken: bearer,
    audience: required("GOOGLE_PLAY_NOTIFICATION_AUDIENCE"),
  })
  const payload = ticket.getPayload()
  if (
    !payload?.email_verified ||
    payload.email !== required("GOOGLE_PLAY_NOTIFICATION_SERVICE_EMAIL")
  )
    throw new Error("Notification sender rejected")
}
