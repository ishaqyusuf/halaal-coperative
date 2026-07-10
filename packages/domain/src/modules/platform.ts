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
  process.env.PLATFORM_ROOT_DOMAIN?.trim() || "halaalvest.com"
const localRootDomain =
  process.env.LOCAL_ROOT_DOMAIN?.trim() || "halaalvest.localhost"
const tenantRootDomain =
  process.env.TENANT_ROOT_DOMAIN?.trim() || localRootDomain
const dashboardRootDomain =
  process.env.DASHBOARD_ROOT_DOMAIN?.trim() || tenantRootDomain

export const platformIdentity: PlatformIdentity = {
  appName: "halaalvest",
  rootDomain: platformRootDomain,
  localRootDomain,
  dashboardRootDomain,
  tenantRootDomain,
  positioning:
    "A cooperative operations platform for savings, loans, charges, dividends, and internal workflows.",
  caseStudyTenants: ["Amanah Staff Thrift Cooperative"],
}
