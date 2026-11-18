import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { PricingComparison } from "@/components/marketing/pricing-comparison"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getSignupHref } from "@/lib/runtime-url"

export default async function PricingPage() {
  const marketing = getMarketingConfig()
  const earlyAccess = marketing.earlyAccessModeEnabled
  const signupHref = earlyAccess
    ? "/signup"
    : process.env.NODE_ENV === "production"
      ? "/signup"
      : await getSignupHref()
  const ctaLabel = earlyAccess ? "Request access" : "Sign up"

  return (
    <>
      <MarketingHeader ctaLabel={ctaLabel} signupHref={signupHref} />
      <PricingComparison ctaLabel={ctaLabel} signupHref={signupHref} />
      <MarketingFooter
        signupLink={
          earlyAccess
            ? ["/signup", "Early access"]
            : [signupHref, "Sign up"]
        }
      />
    </>
  )
}
