import { isApprovedPublicPolicy } from "@halaalvest/db"
import {
  policyPublications,
  publicPolicies,
  type PolicyPublication,
  type PublicPolicy,
} from "@halaalvest/domain/public-policies"

const requiredStoreSalePolicies = [
  "terms",
  "privacy",
  "billing-policy",
  "delete-account",
  "support",
  "cooperative-disclosures",
] as const

export function canOfferStoreProducts({
  environment,
  productionSalesEnabled,
  sandboxTenantEligible,
  publications = policyPublications,
  policies = publicPolicies,
  now = new Date(),
}: {
  environment: string | undefined
  productionSalesEnabled: boolean
  sandboxTenantEligible: boolean
  publications?: Record<
    (typeof requiredStoreSalePolicies)[number],
    PolicyPublication
  >
  policies?: Record<(typeof requiredStoreSalePolicies)[number], PublicPolicy>
  now?: Date
}) {
  if (environment === "sandbox") {
    return sandboxTenantEligible
  }
  if (environment !== "production" || !productionSalesEnabled) return false
  return requiredStoreSalePolicies.every((type) =>
    isApprovedPublicPolicy(type, publications[type], policies[type], now)
  )
}

export function canRestoreStorePurchases({
  environment,
  sandboxTenantEligible,
}: {
  environment: string | undefined
  sandboxTenantEligible: boolean
}) {
  return (
    environment === "production" ||
    (environment === "sandbox" && sandboxTenantEligible)
  )
}
