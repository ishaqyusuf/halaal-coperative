// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test"
import { commandForOptions, parseArgs } from "./dev"

describe("dev script profile router", () => {
  test("defaults to local dev", () => {
    expect(parseArgs([])).toEqual({
      profile: "local",
      task: "dev:portless",
      passthroughArgs: [],
    })
  })

  test("supports prod without local prepare", () => {
    const options = parseArgs(["--prod", "-f", "web", "api"])

    expect(commandForOptions(options)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "HALAALVEST_ENV=production",
      "HALAALVEST_REQUIRE_PROD_DATABASE_URL=1",
      "turbo",
      "dev",
      "--parallel",
      "--filter",
      "@halaalvest/web",
      "--filter",
      "@halaalvest/api",
    ])
  })

  test("defaults local dev to portless", () => {
    const options = parseArgs(["--f", "dashboard"])

    expect(commandForOptions(options)).toContain("dev:portless")
    expect(commandForOptions(options)).toContain("@halaalvest/dashboard")
  })

  test("rejects removed portless flag", () => {
    expect(() => parseArgs(["--portless"])).toThrow(
      "Unknown dev flag: --portless"
    )
  })

  test("supports exact, bare, suffix-excluded, and repeated filter aliases", () => {
    expect(parseArgs(["--filter", "api", "-f", "jobs", "--f", "web!"])).toEqual(
      {
        profile: "local",
        task: "dev:portless",
        filters: {
          targets: ["@halaalvest/api", "@halaalvest/jobs", "!@halaalvest/web"],
        },
        passthroughArgs: [],
      }
    )
  })

  test("passes complex turbo selectors through without package validation", () => {
    expect(parseArgs(["-filter", "@halaalvest/web...", "{apps/*}"])).toEqual({
      profile: "local",
      task: "dev:portless",
      filters: {
        targets: ["@halaalvest/web...", "{apps/*}"],
      },
      passthroughArgs: [],
    })
  })

  test("passes turbo args after -- through", () => {
    const options = parseArgs(["-f", "api", "--", "--dry-run=json"])

    expect(commandForOptions(options)).toContain("--dry-run=json")
  })

  test("lists valid packages when a filter target is missing", () => {
    expect(() => parseArgs(["-f", "marketing"])).toThrow(
      /Unknown dev filter package: marketing\nValid packages: .*@halaalvest\/api.*@halaalvest\/web/s
    )
  })
})
