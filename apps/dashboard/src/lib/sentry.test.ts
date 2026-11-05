import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"

const sentryCalls: { method: string; args: unknown[] }[] = []
let sentryModuleLoads = 0

mock.module("@sentry/nextjs", () => {
  sentryModuleLoads += 1
  return {
    captureException: (...args: unknown[]) => {
      sentryCalls.push({ args, method: "captureException" })
      return "event-id"
    },
    init: (...args: unknown[]) => {
      sentryCalls.push({ args, method: "init" })
    },
  }
})

const { captureDashboardError, initializeDashboardSentry } =
  await import("./sentry")

const env = process.env as Record<string, string | undefined>
const envKeys = [
  "NODE_ENV",
  "SENTRY_DSN_DASHBOARD",
  "SENTRY_ENVIRONMENT_DASHBOARD",
] as const
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, env[key]]))
const productionInput = {
  dsn: "https://public@sentry.example/1",
  environment: "production",
  release: "dashboard@1",
}

describe("dashboard Sentry loader", () => {
  beforeEach(() => {
    sentryCalls.length = 0
  })

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete env[key]
      else env[key] = savedEnv[key]
    }
  })

  it("does not load the SDK when Sentry is disabled", async () => {
    env.NODE_ENV = "development"

    expect(await initializeDashboardSentry(productionInput)).toBe(false)
    expect(
      await initializeDashboardSentry({ ...productionInput, dsn: "" })
    ).toBe(false)

    captureDashboardError(new Error("boom"), "dashboard.query_cache")
    await Promise.resolve()

    expect(sentryModuleLoads).toBe(0)
    expect(sentryCalls).toEqual([])
  })

  it("initialises and reports through the lazily loaded SDK in production", async () => {
    env.NODE_ENV = "production"
    env.SENTRY_DSN_DASHBOARD = productionInput.dsn
    env.SENTRY_ENVIRONMENT_DASHBOARD = "production"

    expect(await initializeDashboardSentry(productionInput)).toBe(true)
    expect(sentryModuleLoads).toBe(1)
    const init = sentryCalls.find((call) => call.method === "init")
    expect(init?.args[0]).toMatchObject({
      dsn: productionInput.dsn,
      enabled: true,
      environment: "production",
      release: "dashboard@1",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    })

    const error = new Error("database exploded")
    await captureDashboardError(error, "dashboard.query_cache")
    await captureDashboardError(error, "dashboard.query_cache")

    const captures = sentryCalls.filter(
      (call) => call.method === "captureException"
    )
    expect(captures).toHaveLength(1)
    expect(sentryCalls.map((call) => call.method)).toEqual([
      "init",
      "captureException",
    ])
  })
})
