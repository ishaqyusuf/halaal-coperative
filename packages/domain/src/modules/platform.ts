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
  process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() || "halaalvest.com"
const localRootDomain =
  process.env.HALAAL_VEST_LOCAL_ROOT_DOMAIN?.trim() || "halaalvest.localhost"
const tenantRootDomain =
  process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() || "app.halaalvest.localhost"
const dashboardRootDomain = tenantRootDomain

export const platformIdentity: PlatformIdentity = {
  appName: "halaalvest",
  rootDomain: platformRootDomain,
  localRootDomain,
  dashboardRootDomain,
  tenantRootDomain,
  positioning:
    "A multi-tenant cooperative operations platform for savings, loans, charges, dividends, and internal workflows.",
  caseStudyTenants: ["Amanah Staff Thrift Cooperative"],
}
