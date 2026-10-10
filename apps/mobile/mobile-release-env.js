const localHostnames = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "10.0.2.2",
])
const productionServiceHostnames = new Set([
  "app.halaalvest.com",
  "api.halaalvest.com",
])

function assertMobileReleaseEnvironment({
  apiUrl,
  appVariant,
  dashboardUrl,
  easBuildProfile,
  legalOrigin,
}) {
  const variant = appVariant?.trim().toLowerCase()
  const profile = easBuildProfile?.trim().toLowerCase()
  if (
    variant &&
    !["development", "dev", "local", "preview", "production"].includes(variant)
  ) {
    throw new Error("APP_VARIANT must be development, preview, or production.")
  }
  if (["preview", "production"].includes(profile) && variant !== profile) {
    throw new Error("APP_VARIANT must match the release EAS_BUILD_PROFILE.")
  }
  if (
    ["store-qa", "native-validation"].includes(profile) &&
    variant !== "production"
  ) {
    throw new Error(
      "APP_VARIANT must be production for store-qa and native-validation builds."
    )
  }
  const explicitReleaseBuild = [appVariant, easBuildProfile]
    .map((value) => value?.trim().toLowerCase())
    .some((value) => value === "preview" || value === "production")

  if (!explicitReleaseBuild) return

  const allowValidationEndpoint = profile === "native-validation"
  validateReleaseUrl("EXPO_PUBLIC_API_URL", apiUrl, allowValidationEndpoint)
  validateReleaseUrl(
    "EXPO_PUBLIC_DASHBOARD_URL",
    dashboardUrl,
    allowValidationEndpoint
  )
  if (
    (variant === "preview" && legalOrigin?.trim()) ||
    (variant === "production" && profile !== "native-validation")
  ) {
    validateReleaseUrl("EXPO_PUBLIC_LEGAL_ORIGIN", legalOrigin)
  }
  if (profile === "store-qa" || variant === "preview") {
    for (const [name, value] of [
      ["EXPO_PUBLIC_API_URL", apiUrl],
      ["EXPO_PUBLIC_DASHBOARD_URL", dashboardUrl],
    ]) {
      const hostname = new URL(value.trim()).hostname
        .toLowerCase()
        .replace(/\.$/, "")
      if (productionServiceHostnames.has(hostname)) {
        throw new Error(
          `${name} must not use a production service host for ${variant === "preview" ? "preview" : "store-qa"} builds.`
        )
      }
    }
  }
}

function validateReleaseUrl(name, value, allowValidationEndpoint = false) {
  const normalized = value?.trim()

  if (!normalized) {
    throw new Error(`${name} is required for preview and production builds.`)
  }

  let url

  try {
    url = new URL(normalized)
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL.`)
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  const localOrLiteral =
    localHostnames.has(hostname) ||
    /\.(?:localhost|local|internal)$/.test(hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname.startsWith("[")
  if (
    url.protocol !== "https:" ||
    localOrLiteral ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must use a non-local HTTPS origin for preview and production builds.`
    )
  }
  if (
    name === "EXPO_PUBLIC_LEGAL_ORIGIN" &&
    (url.pathname !== "/" ||
      /(?:^|\.)(?:invalid|test|example)$/.test(hostname) ||
      /(?:^|\.)example\.(?:com|net|org)$/.test(hostname))
  ) {
    throw new Error(`${name} must be a public HTTPS origin without a path.`)
  }
  if (
    !allowValidationEndpoint &&
    (/(?:^|\.)(?:invalid|test|example)$/.test(hostname) ||
      /(?:^|\.)example\.(?:com|net|org)$/.test(hostname))
  ) {
    throw new Error(`${name} must not use a reserved placeholder domain.`)
  }
}

module.exports = { assertMobileReleaseEnvironment }
