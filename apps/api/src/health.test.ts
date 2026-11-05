import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildLivenessPayload, checkDatabaseReadiness } from "./health"

describe("buildLivenessPayload", () => {
  test("answers without any database fields", () => {
    const payload = buildLivenessPayload(new Date("2026-11-05T00:00:00.000Z"))
    expect(payload).toEqual({
      api: "ok",
      check: "liveness",
      timestamp: "2026-11-05T00:00:00.000Z",
    })
  })
})

describe("checkDatabaseReadiness", () => {
  test("reports not-configured without running a probe", async () => {
    const result = await checkDatabaseReadiness(null)
    expect(result.status).toBe(503)
    expect(result.body.database).toBe("not-configured")
  })

  test("runs exactly one probe and reports latency when ready", async () => {
    let calls = 0
    let tick = 100
    const result = await checkDatabaseReadiness(
      async () => {
        calls += 1
      },
      () => (tick += 7)
    )
    expect(calls).toBe(1)
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ database: "ready", latencyMs: 7 })
  })

  test("reports unavailable without leaking the provider error", async () => {
    const result = await checkDatabaseReadiness(async () => {
      throw new Error("password authentication failed for user secret")
    })
    expect(result.status).toBe(503)
    expect(result.body.database).toBe("unavailable")
    expect(JSON.stringify(result.body)).not.toContain("secret")
  })
})

describe("API health routes", () => {
  const source = readFileSync(join(import.meta.dir, "index.ts"), "utf8")

  test("liveness routes never build a request context", () => {
    expect(source).not.toContain("buildRequestContext")
    expect(source).toContain('app.get("/live", (c) => c.json(buildLivenessPayload()))')
    expect(source).toContain('app.get("/health", (c) => c.json(buildLivenessPayload()))')
  })

  test("database readiness stays an explicit separate route", () => {
    expect(source).toContain('app.get("/ready"')
    expect(source).toContain("checkDatabaseReadiness()")
  })
})
