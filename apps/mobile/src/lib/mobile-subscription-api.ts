import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  readCachedMobileQuery,
  type MobileReadCacheState,
} from "@/lib/read-cache"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { getDevSubscriptionSnapshot } from "@/dev/mobile-dev-fixtures"

export type MobileSubscriptionPlanCode =
  | "free_beta"
  | "starter"
  | "standard"
  | "growth"
  | "enterprise"

export type MobileSubscriptionPlan = {
  activeMemberLimit: number | null
  addonDefinitions: {
    billingCategory: "separate_addon"
    code: string
    description: string
    displayName: string
    pricing: "quoted_separately"
  }[]
  availableAddonCodes: string[]
  code: MobileSubscriptionPlanCode
  description: string
  displayName: string
  entitlements: {
    auditDepth: string
    coreFinance: true
    customDomain: boolean
    emailNotifications: string
    memberLogin: boolean
    memberStatements: string
    reportDepth: string
    roleDepth: string
    whatsAppNotifications: string
    whiteLabel: string
  }
  isPublic: boolean
  monthlyPrice: {
    billingCategory: "subscription_fee"
    billingInterval: "month"
    currencyCode: "NGN"
    maximum: number | null
    minimum: number | null
  }
  passThroughCostDefinitions: {
    billingCategory: "provider_pass_through"
    code: string
    description: string
    displayName: string
    pricing: "provider_usage_rate"
  }[]
  setupFee: {
    billingCategory: "setup_fee"
    billingInterval: "one_time"
    currencyCode: "NGN"
    maximum: number | null
    minimum: number | null
  }
  sortOrder: number
}

export type MobileSubscriptionSnapshot = {
  addons: {
    code: string
    displayName?: string
    endsAt?: string | null
    startsAt?: string
    status: string
  }[]
  availablePlans: MobileSubscriptionPlan[]
  billingPeriod: {
    cancelAtPeriodEnd: boolean
    currentPeriodEndsAt: string | null
    currentPeriodStartsAt: string | null
    graceEndsAt: string | null
    trialEndsAt: string | null
    trialStartsAt: string | null
  }
  cache?: MobileReadCacheState
  enforcement: {
    accessEnabled: boolean
    canActivateMember: boolean
    memberLoginEnabled: boolean
    reason: string | null
  }
  entitlements: MobileSubscriptionPlan["entitlements"]
  invoices: {
    amountPaid: number
    currencyCode: string
    dueAt: string | null
    hostedInvoiceUrl: string | null
    id: string
    invoiceNumber: string | null
    paidAt: string | null
    status: string
    totalAmount: number
  }[]
  plan: MobileSubscriptionPlan
  source: string
  sourceState: {
    billingInfrastructureAvailable: boolean
    fallbackApplied: boolean
    [key: string]: unknown
  }
  status: string
  subscriptionId: string | null
  tenantId: string
  updatedAt: string
  usage: {
    activeMemberCount: number
    activeMemberLimit: number | null
    isAtCapacity: boolean
    isOverCapacity: boolean
    remainingActiveMembers: number | null
    usagePercent: number | null
  }
}

export type MobilePlanChangeIntent = {
  checkoutAvailable: boolean
  checkoutUrl: string | null
  expiresAt?: string | null
  intentId: string
  requestedPlanCode: MobileSubscriptionPlanCode
  status: string
  supportMessage: string | null
}

export async function getMobileSubscriptionSnapshot() {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("admin.subscription", async () =>
      getDevSubscriptionSnapshot()
    )
  }
  const client = createMobileTrpcClient()

  return readCachedMobileQuery("admin.subscription", () =>
    (
      client.subscriptions.snapshot.query() as Promise<MobileSubscriptionSnapshot>
    ).then((snapshot) => ({
      ...snapshot,
      invoices: snapshot.invoices.map((invoice) => ({
        ...invoice,
        hostedInvoiceUrl: null,
      })),
    }))
  )
}
