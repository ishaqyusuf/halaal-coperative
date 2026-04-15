export interface PlatformIdentity {
  appName: string
  rootDomain: string
  localRootDomain: string
  dashboardRootDomain: string
  tenantRootDomain: string
  positioning: string
  caseStudyTenants: string[]
}

const platformRootDomain =
  process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() || "halaal-vest.com"
const localRootDomain =
  process.env.HALAAL_VEST_LOCAL_ROOT_DOMAIN?.trim() || "halaal-vest.localhost"
const dashboardRootDomain =
  process.env.HALAAL_VEST_DASHBOARD_ROOT_DOMAIN?.trim() || "app.halaal-vest.localhost"
const tenantRootDomain =
  process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() || "app.halaal-vest.localhost"

export const platformIdentity: PlatformIdentity = {
  appName: "halaal-vest",
  rootDomain: platformRootDomain,
  localRootDomain,
  dashboardRootDomain,
  tenantRootDomain,
  positioning:
    "A multi-tenant cooperative operations platform for savings, loans, charges, dividends, and internal workflows.",
  caseStudyTenants: ["Amanah Staff Thrift Cooperative"],
}
