export type MarketingStage = "launch" | "prelaunch"

export type MarketingConfig = {
  isLaunchReady: boolean
  stage: MarketingStage
}

function normalizeStage(input: string | undefined): MarketingStage {
  const normalized = input?.trim().toLowerCase()

  if (normalized === "launch") {
    return "launch"
  }

  return "prelaunch"
}

export function getMarketingConfig(): MarketingConfig {
  const stage = normalizeStage(process.env.HALAAL_VEST_MARKETING_STAGE)

  return {
    isLaunchReady: stage === "launch",
    stage,
  }
}
