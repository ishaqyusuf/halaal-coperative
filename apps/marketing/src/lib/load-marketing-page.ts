import { listTenants } from "@halaalvest/db"
import type { MarketingConfig } from "@halaalvest/domain"
import type { MarketingExperienceProps } from "@/components/marketing/marketing-experience-contract"
import { getMarketingQaQuickFillContext } from "./qa-form-access.server"
import { getSignupHref } from "./runtime-url"

export async function loadMarketingPageData(
  marketing: MarketingConfig
): Promise<{
  experienceProps: MarketingExperienceProps
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
  const signupHref = marketing.earlyAccessModeEnabled
    ? "#early-access"
    : await getSignupHref()
  const quickFill = await getMarketingQaQuickFillContext()

  return {
    experienceProps: {
      isLaunchReady: marketing.isLaunchReady,
      quickFill,
      signupHref,
    },
    showDevTenantFab,
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      memberCount: tenant.memberCount,
      name: tenant.name,
      slug: tenant.slug,
    })),
  }
}
