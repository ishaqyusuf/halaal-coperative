import { z } from "zod"

export const storeSchema = z.enum(["apple", "google"])
export type Store = z.infer<typeof storeSchema>
export const paidPlanSchema = z.enum(["starter", "standard", "growth"])
export const storeProductSchema = z
  .object({
    store: storeSchema,
    productId: z.string().min(1).max(200),
    planCode: paidPlanSchema,
    basePlanId: z.string().min(1).max(100).optional(),
  })
  .strict()
export type StoreProduct = z.infer<typeof storeProductSchema>

export class LegacyCatalogMismatchError extends Error {
  constructor() {
    super("Product is outside the historical tenant catalog")
  }
}

export function parseStoreCatalog(value: string | undefined): StoreProduct[] {
  if (!value?.trim()) return []
  const products = z.array(storeProductSchema).max(20).parse(JSON.parse(value))
  const keys = new Set<string>()
  const plans = new Set<string>()
  for (const product of products) {
    const key = `${product.store}:${product.productId}`
    const plan = `${product.store}:${product.planCode}`
    if (keys.has(key) || plans.has(plan))
      throw new Error("Duplicate store catalog mapping")
    if (product.store === "google" && !product.basePlanId)
      throw new Error("Google base plan is required")
    if (product.store === "apple" && product.basePlanId)
      throw new Error("Apple does not use Google base plans")
    keys.add(key)
    plans.add(plan)
  }
  return products
}

export type StoreEntitlement = {
  accountBinding: string
  productId: string
  planCode: z.infer<typeof paidPlanSchema>
  providerName: "apple_app_store" | "google_play"
  providerSubscriptionId: string
  previousProviderSubscriptionId?: string
  periodStartsAt: Date
  periodEndsAt: Date
  graceEndsAt: Date | null
  status: "active" | "grace" | "suspended" | "cancelled"
  cancelAtPeriodEnd: boolean
  verifiedAt: Date
  environment: "production" | "sandbox"
}

const uuid = z.uuid()
const date = z.number().finite().positive()
export function appleEntitlement(input: {
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
  catalog: StoreProduct[]
  verifiedAt: Date
  environment: StoreEntitlement["environment"]
}): StoreEntitlement {
  const tx = input.transaction
  const product = input.catalog.find(
    (p) => p.store === "apple" && p.productId === tx.productId
  )
  if (!product) throw new LegacyCatalogMismatchError()
  if (
    tx.type !== "Auto-Renewable Subscription" ||
    tx.inAppOwnershipType !== "PURCHASED"
  )
    throw new Error("Unsupported Apple subscription")
  const starts = date.parse(tx.purchaseDate)
  const ends = date.parse(tx.expiresDate)
  if (
    ends <= starts ||
    !tx.originalTransactionId ||
    ![1, 2, 3, 4, 5].includes(input.status)
  )
    throw new Error("Invalid Apple subscription evidence")
  const now = input.verifiedAt.getTime()
  const grace = input.renewal.gracePeriodExpiresDate
  const hasGrace =
    input.status === 4 &&
    typeof grace === "number" &&
    Number.isFinite(grace) &&
    grace > now
  const revoked = tx.revocationDate !== undefined || input.status === 5
  return {
    accountBinding: uuid.parse(tx.appAccountToken).toLowerCase(),
    productId: product.productId,
    planCode: product.planCode,
    providerName: "apple_app_store",
    providerSubscriptionId: tx.originalTransactionId,
    periodStartsAt: new Date(starts),
    periodEndsAt: new Date(ends),
    graceEndsAt: hasGrace && !revoked ? new Date(grace!) : null,
    status: revoked
      ? "suspended"
      : hasGrace
        ? "grace"
        : input.status === 1 && ends > now
          ? "active"
          : "suspended",
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

export function googleEntitlement(input: {
  purchase: unknown
  tokenDigest: string
  digest: (token: string) => string
  catalog: StoreProduct[]
  verifiedAt: Date
  environment: StoreEntitlement["environment"]
}): { entitlement: StoreEntitlement; acknowledgementRequired: boolean } {
  const purchase = googlePurchaseSchema.parse(input.purchase)
  if (Boolean(purchase.testPurchase) !== (input.environment === "sandbox"))
    throw new Error("Store environment mismatch")
  const liveItems = purchase.lineItems.filter(
    (item) => item.expiryTime && new Date(item.expiryTime) > input.verifiedAt
  )
  if (liveItems.length > 1)
    throw new Error("Ambiguous Google subscription entitlement")
  const item =
    liveItems[0] ??
    (purchase.lineItems.length === 1 ? purchase.lineItems[0]! : undefined)
  if (!item?.expiryTime)
    throw new Error("No current Google subscription entitlement")
  if (
    !input.catalog.some(
      (p) => p.store === "google" && p.productId === item.productId
    )
  )
    throw new LegacyCatalogMismatchError()
  const pendingItems = purchase.lineItems.filter(
    (candidate) => !candidate.expiryTime
  )
  if (pendingItems.length) {
    const pending = pendingItems[0]!
    const configuredPending = input.catalog.some(
      (p) =>
        p.store === "google" &&
        p.productId === pending.productId &&
        p.basePlanId === pending.offerDetails.basePlanId
    )
    if (
      pendingItems.length !== 1 ||
      purchase.lineItems.length !== 2 ||
      !liveItems.length ||
      item.deferredItemReplacement?.productId !== pending.productId ||
      !configuredPending
    ) {
      throw new Error("Invalid deferred Google subscription replacement")
    }
  } else if (purchase.lineItems.length === 2 && !liveItems.length) {
    throw new Error("Ambiguous expired Google subscription items")
  }
  if (item.deferredItemReplacement && !pendingItems.length)
    throw new Error("Incomplete deferred Google subscription replacement")
  const product = input.catalog.find(
    (p) =>
      p.store === "google" &&
      p.productId === item.productId &&
      p.basePlanId === item.offerDetails.basePlanId
  )
  if (!product) throw new Error("Unconfigured Google subscription")
  const states = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
    "SUBSCRIPTION_STATE_EXPIRED",
    "SUBSCRIPTION_STATE_ON_HOLD",
    "SUBSCRIPTION_STATE_PAUSED",
  ]
  if (!states.includes(purchase.subscriptionState))
    throw new Error("Purchase is pending or unavailable")
  const start = new Date(purchase.startTime)
  const end = new Date(item.expiryTime)
  if (end <= start) throw new Error("Invalid subscription period")
  const live = end > input.verifiedAt
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
    entitlement: {
      accountBinding:
        purchase.externalAccountIdentifiers.obfuscatedExternalAccountId.toLowerCase(),
      productId: item.productId,
      planCode: product.planCode,
      providerName: "google_play",
      providerSubscriptionId: input.tokenDigest,
      previousProviderSubscriptionId: purchase.linkedPurchaseToken
        ? input.digest(purchase.linkedPurchaseToken)
        : undefined,
      periodStartsAt: start,
      periodEndsAt: end,
      graceEndsAt: grace ? end : null,
      status: grace ? "grace" : active ? "active" : "suspended",
      cancelAtPeriodEnd:
        pendingItems.length === 0 &&
        item.autoRenewingPlan?.autoRenewEnabled !== true,
      verifiedAt: input.verifiedAt,
      environment: input.environment,
    },
  }
}
