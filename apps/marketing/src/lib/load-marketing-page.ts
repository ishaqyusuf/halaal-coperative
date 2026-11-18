import { listTenants } from "@halaalvest/db"
import type { HomepageProps } from "@/components/marketing/homepage/homepage"
import { getSignupHref } from "./runtime-url"

export async function loadMarketingPageData(): Promise<{
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
  const signupHref = showDevTenantFab ? await getSignupHref() : "/signup"

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
