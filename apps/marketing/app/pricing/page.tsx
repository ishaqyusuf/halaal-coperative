import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/trust-access-sections"
import { PricingComparison } from "@/components/marketing/pricing-comparison"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getSignupHref } from "@/lib/runtime-url"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PricingPage() {
  const marketing = getMarketingConfig()
  const signupHref = marketing.earlyAccessModeEnabled
    ? "/#early-access"
    : await getSignupHref()

  return (
    <>
      <MarketingHeader signupHref={signupHref} />
      <PricingComparison signupHref={signupHref} />
      <MarketingFooter />
    </>
  )
}
