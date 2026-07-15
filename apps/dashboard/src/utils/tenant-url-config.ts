import type { TenantUrlConfig } from "@halaalvest/tenant-url"

const defaultDevUrlVariantHosts = [
  "localhost",
  "127.0.0.1",
  "192.168.18.5",
  "10.31.248.73",
]

function withPort(host: string, port: string) {
  return /:\d+$/.test(host) ? host : `${host}:${port}`
}

function getDevUrlVariantPathHosts() {
  if (process.env.NODE_ENV === "production") return []

  const port =
    process.env.PORTLESS_APP_PORT ||
    process.env.DASHBOARD_PORT ||
    process.env.PORT ||
    "1441"
  const hosts =
    process.env.DASHBOARD_DEV_URL_VARIANT_HOSTS?.split(",")
      .map((host) => host.trim())
      .filter(Boolean) ?? defaultDevUrlVariantHosts

  return hosts.map((host) => withPort(host, port))
}

export function getDashboardTenantUrlConfig(): TenantUrlConfig {
  const appRootDomain =
    process.env.NODE_ENV === "production"
      ? process.env.DASHBOARD_ROOT_DOMAIN?.trim() ||
        process.env.PLATFORM_ROOT_DOMAIN?.trim() ||
        process.env.APP_ROOT_DOMAIN?.trim() ||
        "halaalvest.com"
      : process.env.DASHBOARD_ROOT_DOMAIN?.trim() ||
        process.env.APP_ROOT_DOMAIN?.trim() ||
        "halaalvest-dash.localhost"

  return {
    internalPrefix: "",
    appRootDomain,
    additionalRootDomains:
      process.env.NODE_ENV !== "production" ? ["halaalvest.localhost"] : [],
    urlVariantPathHosts: getDevUrlVariantPathHosts(),
    projectSlug: process.env.TENANT_URL_PROJECT_SLUG ?? "halaalvest",
    pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    reservedPaths: [
      "api",
      "_next",
      "analytics",
      "auth",
      "awaiting-approval",
      "charges",
      "contributions",
      "domains",
      "favicon",
      "login",
      "logout",
      "loans",
      "member-signup-links",
      "members",
      "membership-approvals",
      "monthly-records",
      "notifications",
      "repayments",
      "reports",
      "settings",
      "sign-in",
      "sign-up",
      "signup",
    ],
  }
}
