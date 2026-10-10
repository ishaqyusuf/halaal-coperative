import type { MarketingExperienceId } from "@halaalvest/domain"
import type { ComponentType } from "react"
import type { MarketingExperienceProps } from "./marketing-experience-contract"

const marketingExperienceRegistry = {
  "organic-trust-v1": () =>
    import("./experiences/organic-trust-v1").then(
      (module) => module.OrganicTrustV1Landing
    ),
  "ramp-v2": () =>
    import("./experiences/ramp-v2").then((module) => module.RampV2Landing),
} satisfies Record<
  MarketingExperienceId,
  () => Promise<ComponentType<MarketingExperienceProps>>
>

export async function MarketingExperience({
  experienceId,
  ...props
}: MarketingExperienceProps & {
  experienceId: MarketingExperienceId
}) {
  const Experience = await marketingExperienceRegistry[experienceId]()

  return <Experience {...props} />
}
