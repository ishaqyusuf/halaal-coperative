import type { QaQuickFillContext } from "@halaalvest/utils"
import { LandingHero } from "./landing-hero"
import { MarketingHeader } from "./marketing-header"
import { PricingSection } from "./pricing-section"
import { ProductStorySection } from "./product-story-section"
import { SetupMigrationSections } from "./setup-migration-sections"
import {
  EarlyAccessSection,
  MarketingFooter,
  TrustSection,
} from "./trust-access-sections"

export function MarketingLanding({
  isLaunchReady,
  quickFill,
  signupHref,
}: {
  isLaunchReady: boolean
  quickFill: QaQuickFillContext
  signupHref: string
}) {
  return (
    <main
      id="top"
      className="marketing-site min-h-svh overflow-hidden text-[#0B1F36]"
    >
      <MarketingHeader signupHref={signupHref} />
      <LandingHero isLaunchReady={isLaunchReady} signupHref={signupHref} />
      <ProductStorySection />
      <SetupMigrationSections signupHref={signupHref} />
      <TrustSection />
      <PricingSection signupHref={signupHref} />
      <EarlyAccessSection quickFill={quickFill} />
      <MarketingFooter />
    </main>
  )
}
