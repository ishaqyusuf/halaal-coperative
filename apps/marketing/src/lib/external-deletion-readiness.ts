import { getServerEmailDeliveryConfig } from "@/lib/server-notifications"
import { trustedExternalDeletionOrigin } from "@/lib/external-deletion-link"

export function canStartExternalDeletionRequest(input: {
  appEnv: string | undefined
  challengeSecretLength: number
  databaseConfigured: boolean
  emailConfigured: boolean
  emailMode: string
  nodeEnv: string | undefined
  originConfigured: boolean
  qaDomainRouteConfigured: boolean
}) {
  if (input.nodeEnv !== "production") return true
  if (
    !input.databaseConfigured ||
    input.challengeSecretLength < 32 ||
    !input.emailConfigured ||
    !input.originConfigured
  )
    return false
  if (input.appEnv === "preview")
    return input.emailMode === "console" && input.qaDomainRouteConfigured
  if (input.appEnv === "production") return input.emailMode === "live"
  return false
}

export function isExternalDeletionRequestAvailable() {
  if (process.env.NODE_ENV !== "production") return true

  try {
    const email = getServerEmailDeliveryConfig()
    trustedExternalDeletionOrigin({
      appEnv: process.env.APP_ENV,
      marketingAppUrl: process.env.MARKETING_APP_URL,
      publicMarketingAppUrl: process.env.NEXT_PUBLIC_MARKETING_APP_URL,
      platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN,
      vercelEnv: process.env.VERCEL_ENV,
    })
    return canStartExternalDeletionRequest({
      appEnv: process.env.APP_ENV,
      challengeSecretLength:
        process.env.PRIVACY_REQUEST_CHALLENGE_SECRET?.trim().length ?? 0,
      databaseConfigured: Boolean(process.env.HALAALVEST_DATABASE_URL?.trim()),
      emailConfigured: email.configured,
      emailMode: email.deliveryMode,
      nodeEnv: process.env.NODE_ENV,
      originConfigured: true,
      qaDomainRouteConfigured: email.qaDomainRoutes.size > 0,
    })
  } catch {
    return false
  }
}
