import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"

export type MobileAppDuration = "six_months" | "annual"
export type MobileAppProduct = {
  store: "apple" | "google"
  productId: string
  basePlanId?: string
  duration: MobileAppDuration
}
export type MobileAppAccessSnapshot = {
  userBinding: string
  accessAllowed: boolean
  status: string
  duration: MobileAppDuration | null
  periodEndsAt: Date | string | null
  accessEndsAt: Date | string | null
  cancelAtPeriodEnd: boolean
  providerName: string | null
}
export type MobileAppCatalog = {
  products: MobileAppProduct[]
  restorableProductIds: string[]
  userBinding: string | null
}

export function getMobileAppAccessSnapshot(): Promise<MobileAppAccessSnapshot> {
  return createMobileTrpcClient().mobileAppAccess.snapshot.query()
}

export function getMobileAppCatalog(
  store: "apple" | "google"
): Promise<MobileAppCatalog> {
  return createMobileTrpcClient().mobileAppAccess.catalog.query({ store })
}

export function verifyMobileAppPurchase(
  input:
    | { store: "apple"; transactionId: string }
    | { store: "google"; purchaseToken: string }
): Promise<{ verified: true; applied: boolean }> {
  return createMobileTrpcClient().mobileAppAccess.verifyPurchase.mutate(input)
}
