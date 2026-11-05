import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/trust-access-sections"
import { PricingComparison } from "@/components/marketing/pricing-comparison"
import { getMarketingConfig } from "@/lib/marketing-config"
import { resolveActiveMarketingExperienceId } from "@/lib/marketing-experience-policy"
import { getSignupHref } from "@/lib/runtime-url"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PricingPage() {
  const marketing = getMarketingConfig()
  const earlyAccess = marketing.earlyAccessModeEnabled
  const signupHref = earlyAccess ? "/#early-access" : await getSignupHref()
  const ctaLabel = earlyAccess ? "Request access" : "Sign up"
  // Passbook has no guided-setup, workflow or migration sections to link to.
  const isPassbook =
    resolveActiveMarketingExperienceId({
      isProduction: process.env.NODE_ENV === "production",
      requestedExperienceId: marketing.experience,
    }) === "passbook-v3"

  return (
    <>
      <MarketingHeader
        {...(isPassbook
          ? {
              ctaLabel,
              links: [
                ["/#product", "Product"],
                ["/#trust", "Trust"],
                ["/pricing", "Pricing"],
              ],
            }
          : {})}
        signupHref={signupHref}
      />
      <PricingComparison ctaLabel={ctaLabel} signupHref={signupHref} />
      <MarketingFooter
        signupLink={
          earlyAccess
            ? ["/#early-access", "Early access"]
            : [signupHref, "Sign up"]
        }
      />
    </>
  )
}
