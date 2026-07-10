// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test"
import { commandForProfile, parseArgs } from "./db-push"

describe("db:push script profile router", () => {
  test("defaults to local", () => {
    expect(parseArgs([])).toEqual({ profile: "local" })
  })

  test("supports local", () => {
    const options = parseArgs(["--local"])

    expect(options).toEqual({ profile: "local" })
    expect(commandForProfile(options.profile)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "HALAALVEST_DEV_PROFILE=local",
      "bun",
      "run",
      "--cwd",
      "packages/db",
      "db:push",
    ])
  })

  test("supports prod with production database guard", () => {
    const options = parseArgs(["--prod"])

    expect(options).toEqual({ profile: "prod" })
    expect(commandForProfile(options.profile)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "HALAALVEST_ENV=production",
      "HALAALVEST_REQUIRE_PROD_DATABASE_URL=1",
      "bun",
      "run",
      "--cwd",
      "packages/db",
      "db:push",
    ])
  })

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["--local", "--prod"])).toThrow(
      "Conflicting db:push flags"
    )
  })

  test("rejects unknown flags", () => {
    expect(() => parseArgs(["--remote-dev"])).toThrow("Unknown db:push flag")
  })
})
