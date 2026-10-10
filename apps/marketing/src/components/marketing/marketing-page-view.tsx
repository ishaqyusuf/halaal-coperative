import type { MarketingExperienceId } from "@halaalvest/domain"
import { DevTenantFab } from "./dev-tenant-fab"
import { MarketingExperience } from "./marketing-experience"
import type { MarketingExperienceProps } from "./marketing-experience-contract"

type MarketingTenantSummary = {
  id: string
  memberCount: number
  name: string
  slug: string
}

export function MarketingPageView({
  experienceId,
  experienceProps,
  showDevTenantFab,
  tenants,
}: {
  experienceId: MarketingExperienceId
  experienceProps: MarketingExperienceProps
  showDevTenantFab: boolean
  tenants: MarketingTenantSummary[]
}) {
  return (
    <>
      <MarketingExperience experienceId={experienceId} {...experienceProps} />
      {showDevTenantFab ? <DevTenantFab tenants={tenants} /> : null}
    </>
  )
}
