export type MarketingStage = "launch" | "prelaunch"

export type MarketingConfig = {
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

  return {
    isLaunchReady: stage === "launch",
    showHomePage,
    stage,
  }
}
