import { z } from "zod"

export const mobileAppStoreSchema = z.enum(["apple", "google"])
export const mobileAppDurationSchema = z.enum(["six_months", "annual"])

const productSchema = z
  .object({
    store: mobileAppStoreSchema,
    productId: z.string().trim().min(1).max(200),
    duration: mobileAppDurationSchema,
    basePlanId: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export type MobileAppProduct = z.infer<typeof productSchema>

export class PersonalCatalogMismatchError extends Error {
  constructor() {
    super("Product is outside the personal app-access catalog")
  }
}

export function parseMobileAppCatalog(value: string | undefined) {
  if (!value?.trim()) return [] as MobileAppProduct[]
  const products = z.array(productSchema).max(4).parse(JSON.parse(value))
  const durations = new Set<string>()
  const identities = new Set<string>()
  for (const product of products) {
    const duration = `${product.store}:${product.duration}`
    const identity = `${product.store}:${product.productId}:${product.basePlanId ?? ""}`
    if (durations.has(duration) || identities.has(identity))
      throw new Error("Duplicate mobile app catalog mapping")
    if (product.store === "apple" && product.basePlanId)
      throw new Error("Apple mobile app product cannot have a base plan")
    if (product.store === "google" && !product.basePlanId)
      throw new Error("Google mobile app base plan is required")
    durations.add(duration)
    identities.add(identity)
  }
  const googleProducts = products.filter((product) => product.store === "google")
  if (
    googleProducts.length === 2 &&
    googleProducts[0]!.productId !== googleProducts[1]!.productId
  )
    throw new Error("Google durations must use one subscription product")
  return products
}

/** Production offers require both durations on both stores; Restore can use a partial catalog. */
export function completeFirstReleaseMobileAppCatalog(
  products: readonly MobileAppProduct[]
) {
  const google = products.filter((product) => product.store === "google")
  const required = [
    "apple:six_months",
    "apple:annual",
    "google:six_months",
    "google:annual",
  ]
  return (
    products.length === required.length &&
    required.every((identity) =>
      products.some(
        (product) => `${product.store}:${product.duration}` === identity
      )
    ) &&
    google[0]?.productId === google[1]?.productId
  )
}

export type MobileAppEvidence = {
  userBinding: string
  providerName: "apple_app_store" | "google_play"
  providerSubscriptionId: string
  previousProviderSubscriptionId?: string
  productId: string
  duration: z.infer<typeof mobileAppDurationSchema>
  status: "active" | "grace" | "suspended"
  periodStartsAt: Date | null
  periodEndsAt: Date
  graceEndsAt: Date | null
  cancelAtPeriodEnd: boolean
  verifiedAt: Date
  environment: "production" | "sandbox"
}

const uuid = z.uuid()
const positiveTime = z.number().finite().positive()

export function appleMobileAppEvidence(input: {
  transaction: {
    appAccountToken?: string
    productId?: string
    originalTransactionId?: string
    purchaseDate?: number
    expiresDate?: number
    revocationDate?: number
    type?: string
    inAppOwnershipType?: string
  }
  renewal: { autoRenewStatus?: number; gracePeriodExpiresDate?: number }
  status: number
  catalog: MobileAppProduct[]
  environment: MobileAppEvidence["environment"]
  verifiedAt: Date
}): MobileAppEvidence {
  const tx = input.transaction
  const product = input.catalog.find(
    (item) => item.store === "apple" && item.productId === tx.productId
  )
  if (!product) throw new PersonalCatalogMismatchError()
  if (
    tx.type !== "Auto-Renewable Subscription" ||
    tx.inAppOwnershipType !== "PURCHASED" ||
    !tx.originalTransactionId ||
    ![1, 2, 3, 4, 5].includes(input.status)
  )
    throw new Error("Unsupported personal Apple subscription")
  const starts = positiveTime.parse(tx.purchaseDate)
  const ends = positiveTime.parse(tx.expiresDate)
  if (ends <= starts) throw new Error("Invalid Apple subscription period")
  const now = input.verifiedAt.getTime()
  const grace = input.renewal.gracePeriodExpiresDate
  const hasGrace =
    input.status === 4 &&
    typeof grace === "number" &&
    Number.isFinite(grace) &&
    grace > now
  const revoked = tx.revocationDate !== undefined || input.status === 5
  return {
    userBinding: uuid.parse(tx.appAccountToken).toLowerCase(),
    providerName: "apple_app_store",
    providerSubscriptionId: tx.originalTransactionId,
    productId: product.productId,
    duration: product.duration,
    status: revoked
      ? "suspended"
      : hasGrace
        ? "grace"
        : input.status === 1 && ends > now
          ? "active"
          : "suspended",
    periodStartsAt: new Date(starts),
    periodEndsAt: new Date(ends),
    graceEndsAt: hasGrace && !revoked ? new Date(grace!) : null,
    cancelAtPeriodEnd: input.renewal.autoRenewStatus !== 1,
    verifiedAt: input.verifiedAt,
    environment: input.environment,
  }
}

const googlePurchaseSchema = z.object({
  subscriptionState: z.string(),
  startTime: z.iso.datetime({ offset: true }),
  externalAccountIdentifiers: z.object({
    obfuscatedExternalAccountId: z.uuid(),
  }),
  linkedPurchaseToken: z.string().optional(),
  testPurchase: z.object({}).optional(),
  acknowledgementState: z.enum([
    "ACKNOWLEDGEMENT_STATE_PENDING",
    "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
  ]),
  lineItems: z
    .array(
      z.object({
        productId: z.string(),
        expiryTime: z.iso.datetime({ offset: true }).optional(),
        offerDetails: z.object({ basePlanId: z.string() }),
        autoRenewingPlan: z
          .object({ autoRenewEnabled: z.boolean() })
          .optional(),
        deferredItemReplacement: z.object({ productId: z.string() }).optional(),
      })
    )
    .min(1)
    .max(2),
})

export function googleMobileAppEvidence(input: {
  purchase: unknown
  tokenDigest: string
  digest: (token: string) => string
  catalog: MobileAppProduct[]
  environment: MobileAppEvidence["environment"]
  verifiedAt: Date
}): { evidence: MobileAppEvidence; acknowledgementRequired: boolean } {
  const purchase = googlePurchaseSchema.parse(input.purchase)
  if (Boolean(purchase.testPurchase) !== (input.environment === "sandbox"))
    throw new Error("Store environment mismatch")
  const liveItems = purchase.lineItems.filter(
    (item) => item.expiryTime && new Date(item.expiryTime) > input.verifiedAt
  )
  if (liveItems.length > 1)
    throw new Error("Ambiguous personal Google subscription")
  const item =
    liveItems[0] ??
    (purchase.lineItems.length === 1 ? purchase.lineItems[0] : undefined)
  if (!item?.expiryTime)
    throw new Error("No current Google subscription period")
  const pending = purchase.lineItems.filter(
    (candidate) => !candidate.expiryTime
  )
  if (
    pending.length > 0 &&
    (pending.length !== 1 ||
      purchase.lineItems.length !== 2 ||
      liveItems.length !== 1 ||
      item.deferredItemReplacement?.productId !== pending[0]!.productId ||
      !input.catalog.some(
        (product) =>
          product.store === "google" &&
          product.productId === pending[0]!.productId &&
          product.basePlanId === pending[0]!.offerDetails.basePlanId
      ))
  )
    throw new Error("Invalid deferred Google duration change")
  if (item.deferredItemReplacement && pending.length === 0)
    throw new Error("Incomplete Google duration change")
  const product = input.catalog.find(
    (candidate) =>
      candidate.store === "google" &&
      candidate.productId === item.productId &&
      candidate.basePlanId === item.offerDetails.basePlanId
  )
  if (!product) {
    if (
      !input.catalog.some(
        (candidate) =>
          candidate.store === "google" && candidate.productId === item.productId
      )
    )
      throw new PersonalCatalogMismatchError()
    throw new Error("Unconfigured personal Google base plan")
  }
  if (
    ![
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
      "SUBSCRIPTION_STATE_CANCELED",
      "SUBSCRIPTION_STATE_EXPIRED",
      "SUBSCRIPTION_STATE_ON_HOLD",
      "SUBSCRIPTION_STATE_PAUSED",
    ].includes(purchase.subscriptionState)
  )
    throw new Error("Purchase is pending or unavailable")
  const starts = new Date(purchase.startTime)
  const ends = new Date(item.expiryTime)
  if (ends <= starts) throw new Error("Invalid Google subscription period")
  const live = ends > input.verifiedAt
  const grace =
    purchase.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" && live
  const active =
    ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_CANCELED"].includes(
      purchase.subscriptionState
    ) && live
  return {
    acknowledgementRequired:
      purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" &&
      (active || grace),
    evidence: {
      userBinding: uuid
        .parse(purchase.externalAccountIdentifiers.obfuscatedExternalAccountId)
        .toLowerCase(),
      providerName: "google_play",
      providerSubscriptionId: input.tokenDigest,
      previousProviderSubscriptionId: purchase.linkedPurchaseToken
        ? input.digest(purchase.linkedPurchaseToken)
        : undefined,
      productId: item.productId,
      duration: product.duration,
      status: active ? "active" : grace ? "grace" : "suspended",
      periodStartsAt: null,
      periodEndsAt: ends,
      graceEndsAt: grace ? ends : null,
      cancelAtPeriodEnd:
        pending.length === 0 &&
        item.autoRenewingPlan?.autoRenewEnabled === false,
      verifiedAt: input.verifiedAt,
      environment: input.environment,
    },
  }
}
