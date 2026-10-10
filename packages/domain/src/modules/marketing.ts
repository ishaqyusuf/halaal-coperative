export type MarketingStage = "launch" | "prelaunch"

export const marketingExperienceIds = ["organic-trust-v1", "ramp-v2"] as const

export type MarketingExperienceId = (typeof marketingExperienceIds)[number]

export type MarketingConfig = {
  earlyAccessModeEnabled: boolean
  experience: MarketingExperienceId
  isLaunchReady: boolean
  showHomePage: boolean
  stage: MarketingStage
}

const defaultMarketingExperience: MarketingExperienceId = "organic-trust-v1"

export function isMarketingExperienceId(
  input: string
): input is MarketingExperienceId {
  return marketingExperienceIds.includes(input as MarketingExperienceId)
}

function normalizeExperience(input: string | undefined): MarketingExperienceId {
  const normalized = input?.trim().toLowerCase()

  if (normalized && isMarketingExperienceId(normalized)) {
    return normalized
  }

  return defaultMarketingExperience
}

function normalizeStage(input: string | undefined): MarketingStage {
  const normalized = input?.trim().toLowerCase()

  if (normalized === "launch") {
    return "launch"
  }

  return "prelaunch"
}

function normalizeBoolean(
  input: string | undefined,
  fallback: boolean
): boolean {
  const normalized = input?.trim().toLowerCase()

  if (!normalized) {
    return fallback
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }

  return fallback
}

export function getMarketingConfig(): MarketingConfig {
  const stage = normalizeStage(process.env.MARKETING_STAGE)
  const experience = normalizeExperience(process.env.MARKETING_EXPERIENCE)
  const showHomePage = normalizeBoolean(process.env.SHOW_HOME_PAGE, true)
  const earlyAccessModeEnabled = normalizeBoolean(
    process.env.MARKETING_EARLY_ACCESS_ENABLED,
    process.env.NODE_ENV === "production"
  )

  return {
    earlyAccessModeEnabled,
    experience,
    isLaunchReady: stage === "launch",
    showHomePage,
    stage,
  }
}
