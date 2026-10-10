import type { ProductSubscription } from "expo-iap"
import type {
  MobileAppDuration,
  MobileAppProduct,
} from "../api/mobile-app-access-api"

export type MobileAppOffer = {
  mapping: MobileAppProduct
  product: ProductSubscription
  displayPrice: string
  offerToken?: string
}

const durationLabel: Record<MobileAppDuration, string> = {
  six_months: "6 months",
  annual: "year",
}

/** Only admit the exact recurring periods configured for personal access. */
export function resolveMobileAppOffers(
  mappings: MobileAppProduct[],
  products: ProductSubscription[],
  store: "apple" | "google"
): MobileAppOffer[] {
  const storeMappings = mappings.filter((item) => item.store === store)
  const resolved: MobileAppOffer[] = []
  for (const mapping of storeMappings) {
    const product = products.find((item) => item.id === mapping.productId)
    if (!product || product.type !== "subs") continue
    if (store === "apple" && product.platform === "ios") {
      if (
        !product.displayPrice?.trim() ||
        !(
          (mapping.duration === "six_months" &&
            product.subscriptionPeriodUnitIOS === "month" &&
            product.subscriptionPeriodNumberIOS === "6") ||
          (mapping.duration === "annual" &&
            product.subscriptionPeriodUnitIOS === "year" &&
            product.subscriptionPeriodNumberIOS === "1")
        )
      )
        continue
      resolved.push({
        mapping,
        product,
        displayPrice: `${product.displayPrice} / ${durationLabel[mapping.duration]}`,
      })
    }
    if (store === "google" && product.platform === "android") {
      const period = mapping.duration === "six_months" ? "P6M" : "P1Y"
      const offer = product.subscriptionOffers.find(
        (candidate) =>
          candidate.basePlanIdAndroid === mapping.basePlanId &&
          !candidate.installmentPlanDetailsAndroid &&
          candidate.pricingPhasesAndroid?.pricingPhaseList.length === 1 &&
          candidate.pricingPhasesAndroid.pricingPhaseList[0]?.billingPeriod ===
            period &&
          Boolean(
            candidate.pricingPhasesAndroid.pricingPhaseList[0]?.formattedPrice?.trim()
          ) &&
          candidate.pricingPhasesAndroid.pricingPhaseList[0]?.recurrenceMode ===
            1 &&
          Boolean(candidate.offerTokenAndroid)
      )
      if (!offer) continue
      resolved.push({
        mapping,
        product,
        offerToken: offer.offerTokenAndroid!,
        displayPrice: `${offer.pricingPhasesAndroid!.pricingPhaseList[0]!.formattedPrice} / ${durationLabel[mapping.duration]}`,
      })
    }
  }
  // A complete configured pair must not turn into a one-period sale when a
  // provider lookup omits or rejects one product/base plan.
  return storeMappings.length === 2 && resolved.length !== 2 ? [] : resolved
}
