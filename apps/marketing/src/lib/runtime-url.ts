import { headers } from "next/headers"
import { buildSignupUrl, type RuntimeUrlConfig } from "@halaalvest/utils"

function parseOriginLike(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  try {
    return new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`)
  } catch {
    return null
  }
}

function getMainRuntimeConfig(): RuntimeUrlConfig {
  const localRootDomain =
    process.env.WEB_APP_ROOT_DOMAIN ?? process.env.LOCAL_ROOT_DOMAIN

  return {
    appPort:
      process.env.WEB_APP_PORT ??
      process.env.PORTLESS_APP_PORT ??
      1440,
    appRootDomain: localRootDomain,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
    isProduction: process.env.NODE_ENV === "production",
    localHostname: process.env.LOCAL_HOSTNAME ?? "localhost",
    portlessRootDomain:
      process.env.WEB_PORTLESS_ROOT_DOMAIN ?? localRootDomain,
    productionRootDomain: process.env.PLATFORM_ROOT_DOMAIN,
    publicUrl:
      process.env.TENANT_SITE_APP_URL ??
      process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL,
  }
}

export function getMarketingAppOrigin(currentRequestUrl?: string | null) {
  const configuredPublicUrl =
    process.env.MARKETING_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_MARKETING_APP_URL?.trim() ||
    process.env.TENANT_SITE_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL?.trim()
  const configuredOrigin = parseOriginLike(configuredPublicUrl)

  if (configuredOrigin) {
    return configuredOrigin.origin
  }

  const portlessRootDomain =
    process.env.WEB_PORTLESS_ROOT_DOMAIN?.trim() ||
    process.env.WEB_APP_ROOT_DOMAIN?.trim()
  const portlessOrigin = parseOriginLike(portlessRootDomain)

  if (portlessOrigin) {
    return portlessOrigin.origin
  }

  const requestOrigin = parseOriginLike(currentRequestUrl)
  const defaultProtocol =
    process.env.NODE_ENV === "production" ? "https" : "http"
  const productionDomain = process.env.PLATFORM_ROOT_DOMAIN?.trim()

  if (process.env.NODE_ENV === "production" && productionDomain) {
    return `${defaultProtocol}://${productionDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`
  }

  return requestOrigin?.origin ?? "http://halaalvest.localhost"
}

export async function getSignupHref() {
  const headerStore = await headers()

  return buildSignupUrl({
    config: getMainRuntimeConfig(),
    currentHost: headerStore.get("host"),
    currentProtocol: headerStore.get("x-forwarded-proto"),
  })
}
