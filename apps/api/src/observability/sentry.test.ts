import { describe, expect, it } from "bun:test"
import { TRPCError } from "@trpc/server"
import { AppError } from "@halaalvest/errors"
import {
  getApiErrorReport,
  getApiNotificationErrorReport,
  getApiErrorContext,
  getSafeObservabilityRequestId,
  getTrpcErrorReport,
  isSentryEnabled,
  sanitizeApiSentryEvent,
  shouldCaptureTrpcError,
} from "./sentry-policy"

describe("API Sentry policy", () => {
  const requestId = "018f47f3-6f5a-4a42-8d8c-50d13c091111"

  it("does not enable capture for a Vercel preview", () => {
    expect(
      isSentryEnabled({
        deploymentEnvironment: "preview",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(false)
  })

  it("suppresses expected authorization and validation failures", () => {
    expect(
      shouldCaptureTrpcError(new TRPCError({ code: "UNAUTHORIZED" }))
    ).toBe(false)
    expect(shouldCaptureTrpcError(new TRPCError({ code: "FORBIDDEN" }))).toBe(
      false
    )
    expect(shouldCaptureTrpcError(new TRPCError({ code: "BAD_REQUEST" }))).toBe(
      false
    )
  })

  it("reconstructs SDK events without request, identity, or raw messages", () => {
    const sanitized = sanitizeApiSentryEvent({
      event_id: "event-1",
      exception: {
        values: [
          {
            type: "Error",
            value: "private member failure",
          },
        ],
      },
      message: "private member failure",
      request: {
        data: { memberId: "member-1" },
        headers: { authorization: "secret" },
        method: "POST",
        query_string: "memberId=member-1",
        url: "https://api.example.test/members/member-1",
      },
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-API001",
        member_id: "member-1",
        method: "POST",
        runtime: "api",
        source: "hono",
      },
      user: { email: "member@example.test", id: "member-1" },
    })

    expect(sanitized).toEqual({
      event_id: "event-1",
      exception: {
        values: [{ type: "Error", value: "Captured UNEXPECTED" }],
      },
      fingerprint: ["UNEXPECTED", "unknown"],
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-API001",
        method: "POST",
        runtime: "api",
        source: "hono",
      },
    })
    expect(JSON.stringify(sanitized)).not.toContain("member-1")
    expect(JSON.stringify(sanitized)).not.toContain("private member failure")
  })

  it("uses method and request id without raw request paths", () => {
    const context = getApiErrorContext({
      method: "POST",
      requestId,
    })
    expect(context.tags).toMatchObject({
      method: "POST",
      request_id: requestId,
      runtime: "api",
      source: "hono",
    })
    expect(context.tags).not.toHaveProperty("path")
  })

  it("builds bounded tRPC and Hono reports at their public boundaries", () => {
    const error = Object.assign(new Error("Prisma failed for member-1"), {
      code: "P2028",
    })
    const trpcReport = getTrpcErrorReport({
      error: new TRPCError({ cause: error, code: "INTERNAL_SERVER_ERROR" }),
      path: "contributions.record",
      requestId,
      router: "app",
      type: "mutation",
    })
    const honoReport = getApiErrorReport(error, {
      method: "POST",
      requestId,
    })

    expect(trpcReport.captureContext.tags).toMatchObject({
      procedure_type: "mutation",
      request_id: requestId,
      router: "app",
      runtime: "api",
      source: "trpc",
    })
    expect(honoReport.captureContext.tags).toMatchObject({
      method: "POST",
      request_id: requestId,
      runtime: "api",
      source: "hono",
    })
    expect(JSON.stringify(trpcReport.captureContext)).not.toContain("member-1")
    expect(JSON.stringify(honoReport.captureContext)).not.toContain("member-1")
  })

  it("rejects client-controlled correlation values that are not UUIDs", () => {
    expect(getSafeObservabilityRequestId("member-phone-08012345678")).toBe(
      undefined
    )
    expect(getSafeObservabilityRequestId(requestId)).toBe(requestId)
  })

  it("builds a reportable, bounded notification provider event", () => {
    const providerCause = new Error("Resend rejected member@example.test")
    const report = getApiNotificationErrorReport(
      new AppError({
        cause: providerCause,
        code: "PROVIDER_UNAVAILABLE",
        operation: "notifications.email.send",
      })
    )

    expect(report.classified).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      reportable: true,
    })
    expect(report.reportableError).toBe(providerCause)
    expect(report.captureContext.tags).toMatchObject({
      operation: "notifications.email.send",
      runtime: "api",
      source: "notification",
    })
    expect(JSON.stringify(report.captureContext)).not.toContain(
      "member@example.test"
    )
  })
})
