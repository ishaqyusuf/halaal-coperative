import { headers } from "next/headers"
import { buildSignupUrl, type RuntimeUrlConfig } from "@halaalvest/utils"

function getMainRuntimeConfig(): RuntimeUrlConfig {
  const localRootDomain = process.env.HALAAL_VEST_WEB_APP_ROOT_DOMAIN
    ?? process.env.HALAAL_VEST_LOCAL_ROOT_DOMAIN

  return {
    appPort: process.env.HALAAL_VEST_WEB_APP_PORT ?? process.env.PORTLESS_APP_PORT ?? 1440,
    appRootDomain: localRootDomain,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
    isProduction: process.env.NODE_ENV === "production",
    localHostname: process.env.HALAAL_VEST_LOCAL_HOSTNAME ?? "localhost",
    portlessRootDomain: process.env.HALAAL_VEST_WEB_PORTLESS_ROOT_DOMAIN ?? localRootDomain,
    productionRootDomain: process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN,
    publicUrl:
      process.env.TENANT_SITE_APP_URL ??
      process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL,
  }
}

export async function getSignupHref() {
  const headerStore = await headers()

  return buildSignupUrl({
    config: getMainRuntimeConfig(),
    currentHost: headerStore.get("host"),
    currentProtocol: headerStore.get("x-forwarded-proto"),
  })
}
