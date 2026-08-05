import { describe, expect, it } from "bun:test"
import { TRPCError } from "@trpc/server"
import {
  getApiErrorContext,
  isSentryEnabled,
  sanitizeApiSentryEvent,
  shouldCaptureTrpcError,
} from "./sentry"

describe("API Sentry policy", () => {
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

  it("removes request contents and user identity from SDK events", () => {
    const sanitized = sanitizeApiSentryEvent({
      event_id: "event-1",
      request: {
        data: { memberId: "member-1" },
        headers: { authorization: "secret" },
        method: "POST",
        query_string: "memberId=member-1",
        url: "https://api.example.test/members/member-1",
      },
      user: { email: "member@example.test", id: "member-1" },
    })

    expect(sanitized.request).toEqual({ method: "POST" })
    expect(sanitized.user).toBeUndefined()
  })

  it("uses method and request id without raw request paths", () => {
    const context = getApiErrorContext({
      method: "POST",
      requestId: "request-1",
    })
    expect(context.tags).toMatchObject({
      method: "POST",
      request_id: "request-1",
      runtime: "api",
      source: "hono",
    })
    expect(context.tags).not.toHaveProperty("path")
  })
})
