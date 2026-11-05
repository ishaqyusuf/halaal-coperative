import type { QaQuickFillContext } from "@halaalvest/utils"

export type MarketingSignupMode = "direct" | "early-access"

export type MarketingExperienceProps = {
  isLaunchReady: boolean
  quickFill: QaQuickFillContext
  signupHref: string
  signupMode: MarketingSignupMode
  workspaceUrlSuffix: string
}
