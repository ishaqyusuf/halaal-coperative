import { afterEach, describe, expect, test } from "bun:test"
import { getMarketingConfig } from "./marketing"

const originalEnv = {
  marketingStage: process.env.MARKETING_STAGE,
  nodeEnv: process.env.NODE_ENV,
  showHomePage: process.env.SHOW_HOME_PAGE,
}

afterEach(() => {
  process.env.MARKETING_STAGE = originalEnv.marketingStage
  process.env.NODE_ENV = originalEnv.nodeEnv
  process.env.SHOW_HOME_PAGE = originalEnv.showHomePage
})

describe("marketing config", () => {
  test("reads the stage and homepage flags", () => {
    process.env.MARKETING_STAGE = "launch"
    process.env.SHOW_HOME_PAGE = "false"

    expect(getMarketingConfig()).toEqual({
      isLaunchReady: true,
      showHomePage: false,
      stage: "launch",
    })
  })
})
