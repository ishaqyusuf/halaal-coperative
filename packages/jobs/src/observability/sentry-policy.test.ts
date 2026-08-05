import { describe, expect, it } from "bun:test"
import {
  getJobsErrorReport,
  isJobsSentryEnabled,
  sanitizeJobsSentryEvent,
  shouldCaptureTerminalTaskFailure,
} from "./sentry-policy"

describe("jobs Sentry policy", () => {
  it("requires production runtime configuration and a production Trigger environment", () => {
    expect(
      isJobsSentryEnabled({
        deploymentEnvironment: "production",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(true)
    expect(
      shouldCaptureTerminalTaskFailure({
        environmentType: "PREVIEW",
        reportable: true,
      })
    ).toBe(false)
    expect(
      shouldCaptureTerminalTaskFailure({
        environmentType: "PRODUCTION",
        reportable: true,
      })
    ).toBe(true)
  })

  it("does not retain task payloads, identity, or raw errors", () => {
    const event = sanitizeJobsSentryEvent({
      exception: { values: [{ type: "Error", value: "member-1 failed" }] },
      extra: { attempt: 3, payload: { memberId: "member-1" }, run_id: "run-1" },
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-JOB001",
        runtime: "jobs",
        source: "trigger.on_failure",
        task: "monthly-record-generate",
        tenant_id: "tenant-1",
        trigger_environment_type: "PRODUCTION",
      },
      user: { id: "member-1" },
    })

    expect(event).toEqual({
      exception: { values: [{ type: "Error", value: "Captured UNEXPECTED" }] },
      extra: { attempt: 3, run_id: "run-1" },
      fingerprint: ["UNEXPECTED", "unknown"],
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-JOB001",
        runtime: "jobs",
        source: "trigger.on_failure",
        task: "monthly-record-generate",
        trigger_environment_type: "PRODUCTION",
      },
    })
    expect(JSON.stringify(event)).not.toContain("member-1")
  })

  it("builds a bounded terminal failure report without payload data", () => {
    const report = getJobsErrorReport(new Error("private payload"), {
      attempt: 3,
      deploymentVersion: "2026.08.05",
      environment: "prod",
      environmentType: "PRODUCTION",
      runId: "run-1",
      task: "monthly-record-generate",
    })
    expect(report.captureContext.extra).toEqual({
      attempt: 3,
      deployment_version: "2026.08.05",
      run_id: "run-1",
    })
    expect(report.captureContext.tags).toMatchObject({
      runtime: "jobs",
      source: "trigger.on_failure",
      task: "monthly-record-generate",
      trigger_environment_type: "PRODUCTION",
    })
  })
})
