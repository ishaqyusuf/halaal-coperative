import { AppError } from "@halaalvest/errors"

import {
  getVercelProvisioningErrorCause,
  provisionTenantDomainOnVercel as provision,
  type VercelTenantDomainProvisioningResult,
} from "./vercel-domains"
import { captureMarketingError } from "./sentry"

export type { VercelTenantDomainProvisioningResult }

export async function provisionTenantDomainOnVercel(hostname: string) {
  const result = await provision(hostname)
  if (result.status === "failed") {
    captureMarketingError(
      new AppError({
        cause: getVercelProvisioningErrorCause(result),
        code: "PROVIDER_UNAVAILABLE",
        internalMessage: "Vercel domain provisioning failed",
        reportable: true,
      }),
      "marketing.provider",
      { provider: "vercel" }
    )
  }
  return result
}
