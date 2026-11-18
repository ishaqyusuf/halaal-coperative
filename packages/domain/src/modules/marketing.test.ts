import { afterEach, describe, expect, test } from "bun:test"
import { getMarketingConfig } from "./marketing"

const originalEnv = {
  marketingEarlyAccessEnabled: process.env.MARKETING_EARLY_ACCESS_ENABLED,
  marketingStage: process.env.MARKETING_STAGE,
  nodeEnv: process.env.NODE_ENV,
  showHomePage: process.env.SHOW_HOME_PAGE,
}

afterEach(() => {
  process.env.MARKETING_EARLY_ACCESS_ENABLED =
    originalEnv.marketingEarlyAccessEnabled
  process.env.MARKETING_STAGE = originalEnv.marketingStage
  process.env.NODE_ENV = originalEnv.nodeEnv
  process.env.SHOW_HOME_PAGE = originalEnv.showHomePage
})

describe("marketing config", () => {
  test("defaults early access mode on in production", () => {
    delete process.env.MARKETING_EARLY_ACCESS_ENABLED
    process.env.NODE_ENV = "production"

    expect(getMarketingConfig().earlyAccessModeEnabled).toBe(true)
  })

  test("allows early access mode to be controlled explicitly", () => {
    process.env.NODE_ENV = "development"
    process.env.MARKETING_EARLY_ACCESS_ENABLED = "true"

    expect(getMarketingConfig().earlyAccessModeEnabled).toBe(true)

    process.env.MARKETING_EARLY_ACCESS_ENABLED = "false"

    expect(getMarketingConfig().earlyAccessModeEnabled).toBe(false)
  })
})
