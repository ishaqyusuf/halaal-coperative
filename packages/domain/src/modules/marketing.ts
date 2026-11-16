export type MarketingStage = "launch" | "prelaunch"

export type MarketingConfig = {
  earlyAccessModeEnabled: boolean
  isLaunchReady: boolean
  showHomePage: boolean
  stage: MarketingStage
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
  const showHomePage = normalizeBoolean(process.env.SHOW_HOME_PAGE, true)
  const earlyAccessModeEnabled = normalizeBoolean(
    process.env.MARKETING_EARLY_ACCESS_ENABLED,
    process.env.NODE_ENV === "production"
  )

  return {
    earlyAccessModeEnabled,
    isLaunchReady: stage === "launch",
    showHomePage,
    stage,
  }
}
