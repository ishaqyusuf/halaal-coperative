import { trustedMarketingEmailOrigin } from "@/lib/external-deletion-link"
import { getMarketingAppOrigin } from "@/lib/runtime-url"
import { AppError } from "@halaalvest/errors"

type MarketingEmailOriginConfig = {
  appEnv?: string
  marketingAppUrl?: string
  nodeEnv?: string
  platformRootDomain?: string
  publicMarketingAppUrl?: string
  vercelEnv?: string
}

export function getMarketingEmailOrigin(
  requestUrl: string,
  config: MarketingEmailOriginConfig = {
    appEnv: process.env.APP_ENV,
    marketingAppUrl: process.env.MARKETING_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN,
    publicMarketingAppUrl: process.env.NEXT_PUBLIC_MARKETING_APP_URL,
    vercelEnv: process.env.VERCEL_ENV,
  }
) {
  if (config.nodeEnv !== "production") return getMarketingAppOrigin(requestUrl)
  try {
    return trustedMarketingEmailOrigin(config)
  } catch (cause) {
    throw new AppError({
      cause,
      code: "PROVIDER_UNAVAILABLE",
      publicMessage: "Email links are temporarily unavailable.",
    })
  }
}
