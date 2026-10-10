import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
export type StoreProductMapping = { store: "apple" | "google"; productId: string; planCode: "starter" | "standard" | "growth"; basePlanId?: string }
export type StoreCatalog = { products: StoreProductMapping[]; accountBinding: string | null }
export function getStoreCatalog(store: "apple" | "google"): Promise<StoreCatalog> {
  return createMobileTrpcClient().subscriptions.storeCatalog.query({ store })
}
export function verifyStorePurchase(input: { store: "apple"; transactionId: string } | { store: "google"; purchaseToken: string }): Promise<{ verified: boolean; applied: boolean }> {
  return createMobileTrpcClient().subscriptions.verifyStorePurchase.mutate(input)
}
