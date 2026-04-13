export interface PlatformIdentity {
  appName: string
  rootDomain: string
  localRootDomain: string
  dashboardRootDomain: string
  tenantRootDomain: string
  positioning: string
  caseStudyTenants: string[]
}

export const platformIdentity: PlatformIdentity = {
  appName: "halaal-vest",
  rootDomain: "halaal-vest.com",
  localRootDomain: "halaal-vest.localhost",
  dashboardRootDomain: "app.halaal-vest.localhost",
  tenantRootDomain: "tenant.halaal-vest.localhost",
  positioning:
    "A multi-tenant cooperative operations platform for savings, loans, charges, dividends, and internal workflows.",
  caseStudyTenants: ["Amanah Staff Thrift Cooperative"],
}
