import { getQaAcceleratorEnvCapability } from "@halaalvest/api/qa-accelerator-config"
import { listTenants } from "@halaalvest/db"
import type { MarketingConfig } from "@halaalvest/domain"
import { resolveQaQuickFillContext } from "@halaalvest/utils"
import type { OnePlaceLandingProps } from "@/components/marketing/experiences/one-place-v4"
import { getMarketingQaQuickFillContext } from "./qa-form-access.server"
import { getSignupHref } from "./runtime-url"

export async function loadMarketingPageData(
  marketing: MarketingConfig
): Promise<{
  landingProps: OnePlaceLandingProps
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
    : showDevTenantFab
      ? await getSignupHref()
      : "/signup"
  const quickFill = getQaAcceleratorEnvCapability({
    clientKind: "web",
    contractVersion: 1,
  }).available
    ? await getMarketingQaQuickFillContext()
    : resolveQaQuickFillContext({
        authenticatedEmail: null,
        configuredDomains: [],
        isDevelopment: false,
      })

  return {
    landingProps: {
      isLaunchReady: marketing.isLaunchReady,
      quickFill,
      signupHref,
      signupMode: marketing.earlyAccessModeEnabled ? "early-access" : "direct",
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
