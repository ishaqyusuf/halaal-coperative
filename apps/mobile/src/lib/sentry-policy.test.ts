import { describe, expect, it } from "bun:test"
import {
  getMobileErrorReport,
  isMobileSentryEnabled,
  sanitizeMobileSentryEvent,
} from "./sentry-policy"

describe("mobile Sentry policy", () => {
  it("requires an explicit mobile flag, production environment, and DSN", () => {
    const production = {
      deploymentEnvironment: "production",
      dsn: "https://dsn",
      nodeEnvironment: "production",
    }
    expect(
      isMobileSentryEnabled({ ...production, explicitlyEnabled: "false" })
    ).toBe(false)
    expect(
      isMobileSentryEnabled({ ...production, explicitlyEnabled: "true" })
    ).toBe(true)
  })

  it("keeps release-safe update tags and removes device and identity data", () => {
    const event = sanitizeMobileSentryEvent({
      contexts: {
        device: { name: "private phone" },
        os: { name: "private os" },
      },
      exception: { values: [{ type: "Error", value: "member-1 failed" }] },
      tags: {
        app_variant: "production",
        error_code: "UNEXPECTED",
        error_reference: "ERR-MOB001",
        expo_is_embedded_update: "false",
        expo_runtime_version: "0.1.0",
        expo_update_id: "update-1",
        member_id: "member-1",
        runtime: "mobile",
        source: "mobile.error_boundary",
      },
      user: { id: "member-1" },
    })

    expect(event).toEqual({
      exception: { values: [{ type: "Error", value: "Captured UNEXPECTED" }] },
      fingerprint: ["UNEXPECTED", "unknown"],
      tags: {
        app_variant: "production",
        error_code: "UNEXPECTED",
        error_reference: "ERR-MOB001",
        expo_is_embedded_update: "false",
        expo_runtime_version: "0.1.0",
        expo_update_id: "update-1",
        runtime: "mobile",
        source: "mobile.error_boundary",
      },
    })
    expect(JSON.stringify(event)).not.toContain("member-1")
    expect(JSON.stringify(event)).not.toContain("private phone")
  })

  it("builds reports from fixed mobile ownership boundaries", () => {
    const report = getMobileErrorReport(
      new Error("private mutation data"),
      "mobile.mutation_cache"
    )
    expect(report.captureContext.tags).toMatchObject({
      runtime: "mobile",
      source: "mobile.mutation_cache",
    })
  })
})
