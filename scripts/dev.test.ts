// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test"
import { commandForProfile, parseArgs } from "./dev"

describe("dev script profile router", () => {
  test("defaults to local", () => {
    expect(parseArgs([])).toEqual({ profile: "local" })
  })

  test("supports remote-dev", () => {
    expect(parseArgs(["--remote-dev"])).toEqual({ profile: "remote-dev" })
    expect(commandForProfile("remote-dev")).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "APP_ENV=remote-dev",
      "DEV_PROFILE=remote-dev",
      "bun",
      "scripts/dev-run.ts",
    ])
  })

  test("supports prod without local prepare", () => {
    const options = parseArgs(["--prod"])

    expect(options).toEqual({ profile: "prod" })
    expect(commandForProfile(options.profile, options.filters)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "APP_ENV=production",
      "REQUIRE_PROD_DATABASE_URL=1",
      "turbo",
      "dev",
      "--parallel",
    ])
  })

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["--local", "--remote-dev"])).toThrow(
      "Conflicting dev flags"
    )
  })

  test("passes exact monorepo package filters through", () => {
    const options = parseArgs([
      "--filter",
      "@halaalvest/api",
      "@halaalvest/web",
      "@halaalvest/jobs",
    ])

    expect(options).toEqual({
      profile: "local",
      filters: {
        targets: ["@halaalvest/api", "@halaalvest/web", "@halaalvest/jobs"],
      },
    })
    expect(commandForProfile(options.profile, options.filters)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "DEV_PROFILE=local",
      "bun",
      "scripts/dev-run.ts",
      "--filter",
      "@halaalvest/api",
      "--filter",
      "@halaalvest/web",
      "--filter",
      "@halaalvest/jobs",
    ])
  })

  test("supports suffix exclusion syntax for monorepo filters", () => {
    const options = parseArgs([
      "--remote-dev",
      "--filter",
      "@halaalvest/api!",
      "@halaalvest/dashboard!",
    ])

    expect(options).toEqual({
      profile: "remote-dev",
      filters: {
        targets: ["!@halaalvest/api", "!@halaalvest/dashboard"],
      },
    })
    expect(commandForProfile(options.profile, options.filters)).toContain(
      "!@halaalvest/api"
    )
    expect(commandForProfile(options.profile, options.filters)).toContain(
      "!@halaalvest/dashboard"
    )
  })

  test("supports bare package-name shorthand for exact workspace packages", () => {
    const options = parseArgs(["--filter", "api", "dashboard!", "@halaalvest/jobs"])

    expect(options).toEqual({
      profile: "local",
      filters: {
        targets: ["@halaalvest/api", "!@halaalvest/dashboard", "@halaalvest/jobs"],
      },
    })
    expect(commandForProfile(options.profile, options.filters)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "DEV_PROFILE=local",
      "bun",
      "scripts/dev-run.ts",
      "--filter",
      "@halaalvest/api",
      "--filter",
      "!@halaalvest/dashboard",
      "--filter",
      "@halaalvest/jobs",
    ])
  })

  test("supports filter flag aliases", () => {
    const expectedTargets = ["@halaalvest/api", "!@halaalvest/dashboard"]

    for (const filterFlag of ["--filter", "--f", "-f", "-filter"]) {
      expect(parseArgs([filterFlag, "api", "dashboard!"])).toEqual({
        profile: "local",
        filters: {
          targets: expectedTargets,
        },
      })
    }

    expect(parseArgs(["--filter", "api", "-f", "jobs", "--f", "web!"])).toEqual(
      {
        profile: "local",
        filters: {
          targets: ["@halaalvest/api", "@halaalvest/jobs", "!@halaalvest/web"],
        },
      }
    )
  })

  test("passes complex turbo selectors through without package validation", () => {
    expect(
      parseArgs([
        "--filter",
        "@halaalvest/web...",
        "...@halaalvest/dashboard",
        "@halaalvest/*",
        "{apps/*}",
        "[main]",
      ])
    ).toEqual({
      profile: "local",
      filters: {
        targets: [
          "@halaalvest/web...",
          "...@halaalvest/dashboard",
          "@halaalvest/*",
          "{apps/*}",
          "[main]",
        ],
      },
    })
  })

  test("lists valid packages when a filter target is missing", () => {
    expect(() =>
      parseArgs(["--filter", "marketing", "@halaalvest/unknown"])
    ).toThrow(
      /Unknown dev filter packages: marketing, @halaalvest\/unknown\nAvailable packages:\napps\/:\n  @halaalvest\/api[\s\S]*  @halaalvest\/web\npackages\/:\n  @halaalvest\/auth[\s\S]*  @halaalvest\/utils/
    )
  })
})
