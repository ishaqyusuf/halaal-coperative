import { listTenants } from "@halaalvest/db"
import type { MarketingConfig } from "@halaalvest/domain"
import type { HomepageProps } from "@/components/marketing/homepage/homepage"
import { getSignupHref } from "./runtime-url"

export async function loadMarketingPageData(
  marketing: MarketingConfig
): Promise<{
  landingProps: HomepageProps
  showDevTenantFab: boolean
  tenants: {
    id: string
    memberCount: number
    name: string
    slug: string
  }[]
}> {
  const showDevTenantFab = process.env.NODE_ENV !== "production"
  const tenants = showDevTenantFab ? await listTenants() : []
  // In early-access mode /signup shows the request form, so every homepage
  // sign-up button can point there.
  const signupHref = marketing.earlyAccessModeEnabled
    ? "/signup"
    : showDevTenantFab
      ? await getSignupHref()
      : "/signup"

  return {
    landingProps: { signupHref },
    showDevTenantFab,
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      memberCount: tenant.memberCount,
      name: tenant.name,
      slug: tenant.slug,
    })),
  }
}
