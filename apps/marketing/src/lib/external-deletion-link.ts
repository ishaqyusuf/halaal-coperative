export function externalDeletionVerificationUrl(
  origin: string,
  challengeId: string,
  token: string
) {
  const url = new URL("/delete-account/verify", origin)
  url.searchParams.set("challenge", challengeId)
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}

export function trustedMarketingEmailOrigin(input: {
  appEnv?: string
  marketingAppUrl?: string
  publicMarketingAppUrl?: string
  platformRootDomain?: string
  vercelEnv?: string
}) {
  const appEnv = input.appEnv?.trim().toLowerCase()
  const vercelEnv = input.vercelEnv?.trim().toLowerCase()
  if (
    (appEnv === "preview" && vercelEnv === "production") ||
    (appEnv === "production" && vercelEnv === "preview")
  )
    throw new Error("Email environment does not match the deployment target")
  const configured =
    input.marketingAppUrl?.trim() ||
    input.publicMarketingAppUrl?.trim() ||
    input.platformRootDomain?.trim()
  if (!configured)
    throw new Error("A public marketing origin is required for email links")
  const url = new URL(
    configured.includes("://") ? configured : `https://${configured}`
  )
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    hostname === "localhost" ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(
      hostname
    ) ||
    /(?:^|\.)example\.(?:com|net|org)$/.test(hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname.startsWith("[")
  )
    throw new Error("Email links require a non-local HTTPS marketing origin")
  if (
    (appEnv === "preview" || vercelEnv === "preview") &&
    [
      "halaalvest.com",
      "www.halaalvest.com",
      "app.halaalvest.com",
      "api.halaalvest.com",
    ].includes(hostname)
  )
    throw new Error("Preview email links require an isolated marketing origin")
  return url.origin
}

export const trustedExternalDeletionOrigin = trustedMarketingEmailOrigin
