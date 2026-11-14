import {
  MarketingHeader,
  type MarketingHeaderLink,
} from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/trust-access-sections"
import { PricingComparison } from "@/components/marketing/pricing-comparison"
import { getMarketingConfig } from "@/lib/marketing-config"
import { resolveActiveMarketingExperienceId } from "@/lib/marketing-experience-policy"
import { getSignupHref } from "@/lib/runtime-url"

export default async function PricingPage() {
  const marketing = getMarketingConfig()
  const earlyAccess = marketing.earlyAccessModeEnabled
  const signupHref = earlyAccess
    ? "/#early-access"
    : process.env.NODE_ENV === "production"
      ? "/signup"
      : await getSignupHref()
  const ctaLabel = earlyAccess ? "Request access" : "Sign up"
  const activeExperienceId = resolveActiveMarketingExperienceId({
    isProduction: process.env.NODE_ENV === "production",
    requestedExperienceId: marketing.experience,
  })
  // Passbook and One Place have no guided-setup, workflow or migration
  // sections, so the organic header's in-page links would go nowhere.
  const headerLinks: readonly MarketingHeaderLink[] | undefined =
    activeExperienceId === "passbook-v3"
      ? [
          ["/#product", "Product"],
          ["/#trust", "Trust"],
          ["/pricing", "Pricing"],
        ]
      : activeExperienceId === "one-place-v4"
        ? [
            ["/#product", "Product"],
            ["/#how-it-works", "How it works"],
            ["/pricing", "Pricing"],
          ]
        : undefined

  return (
    <>
      <MarketingHeader
        {...(headerLinks ? { ctaLabel, links: headerLinks } : {})}
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
