import type { MarketingExperienceId } from "@halaalvest/domain"

export const marketingExperienceProductionReadiness = {
  "organic-trust-v1": true,
  "ramp-v2": false,
} as const satisfies Record<MarketingExperienceId, boolean>

export function resolveActiveMarketingExperienceId({
  isProduction,
  requestedExperienceId,
}: {
  isProduction: boolean
  requestedExperienceId: MarketingExperienceId
}): MarketingExperienceId {
  if (
    !isProduction ||
    marketingExperienceProductionReadiness[requestedExperienceId]
  ) {
    return requestedExperienceId
  }

  return "organic-trust-v1"
}
