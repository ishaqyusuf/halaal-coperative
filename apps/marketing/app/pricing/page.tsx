import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { PricingComparison } from "@/components/marketing/pricing-comparison"
import { getSignupHref } from "@/lib/runtime-url"

export default async function PricingPage() {
  const signupHref =
    process.env.NODE_ENV === "production" ? "/signup" : await getSignupHref()
  const ctaLabel = "Sign up"

  return (
    <>
      <MarketingHeader ctaLabel={ctaLabel} signupHref={signupHref} />
      <PricingComparison ctaLabel={ctaLabel} signupHref={signupHref} />
      <MarketingFooter
        signupLink={[signupHref, "Sign up"]}
      />
    </>
  )
}
