import type { TenantUrlConfig } from "@halaalvest/tenant-url"

export function getDashboardTenantUrlConfig(): TenantUrlConfig {
  const appRootDomain =
    process.env.NODE_ENV === "production"
      ? process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() ||
        process.env.APP_ROOT_DOMAIN?.trim() ||
        "halaalvest.com"
      : process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() ||
        process.env.HALAAL_VEST_DASHBOARD_ROOT_DOMAIN?.trim() ||
        process.env.APP_ROOT_DOMAIN?.trim() ||
        "app.halaalvest.localhost"

  return {
    internalPrefix: "",
    appRootDomain,
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
