import { describe, expect, test } from "bun:test"
import { getSourceMapUploadConfig, sanitizeSentryEvent } from "./sentry-event"

describe("external diagnostic event policy", () => {
  test("bounds exception data and removes local paths and non-finite extras", () => {
    const event = sanitizeSentryEvent(
      {
        tags: {
          error_code: "UNEXPECTED",
          error_reference: "ERR-BOUND1",
          runtime: "mobile",
          source: "mobile.error_boundary",
        },
        exception: {
          values: Array.from({ length: 10 }, () => ({
            type: "Error",
            stacktrace: {
              frames: Array.from({ length: 120 }, () => ({
                filename:
                  "file:///Users/private-person/work/apps/mobile/src/index.ts?secret=value",
              })),
            },
          })),
        },
        extra: { attempt: Number.POSITIVE_INFINITY },
      },
      { allowedExtraKeys: ["attempt"] }
    )
    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain("private-person")
    expect(serialized).not.toContain("secret")
    expect(event).not.toHaveProperty("extra")
    expect(event).toMatchObject({
      exception: {
        values: Array.from({ length: 4 }, () => ({
          type: "Error",
          value: "Captured UNEXPECTED",
          stacktrace: {
            frames: Array.from({ length: 80 }, () => ({
              filename: "apps/mobile/src/index.ts",
            })),
          },
        })),
      },
    })
  })

  test("does not transmit Android device paths or request URLs as stack filenames", () => {
    const filenames = [
      "/data/user/0/com.halaalvest.mobile/cache/private-statement.csv",
      "/data/user/0/com.halaalvest.mobile/cache/src/private-statement.csv",
      "file:///data/user/0/com.halaalvest.mobile/cache/private-statement.csv",
      "C:\\Users\\private-person\\Downloads\\member-statement.csv",
      "https://api.halaalvest.test/members/member-123",
    ]
    const event = sanitizeSentryEvent({
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-BOUND2",
        runtime: "mobile",
        source: "mobile.error_boundary",
      },
      exception: {
        values: [
          {
            type: "Error",
            stacktrace: { frames: filenames.map((filename) => ({ filename })) },
          },
        ],
      },
    })

    expect(event).toMatchObject({
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                { filename: "local-source" },
                { filename: "local-source" },
                { filename: "local-source" },
                { filename: "local-source" },
                { filename: "external-source" },
              ],
            },
          },
        ],
      },
    })
    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain("private-statement")
    expect(serialized).not.toContain("member-123")
    expect(serialized).not.toContain("private-person")
  })

  test("drops SDK-generated events that did not pass classified capture", () => {
    expect(
      sanitizeSentryEvent({
        exception: { values: [{ type: "Error", value: "private failure" }] },
        request: { url: "https://example.test/private" },
      })
    ).toBeNull()
  })

  test("reconstructs an outbound event from the strict allowlist", () => {
    const event = sanitizeSentryEvent(
      {
        breadcrumbs: [
          { category: "fetch", data: { url: "/members/member-1" } },
        ],
        contexts: {
          device: { name: "Private Phone", unique_id: "device-1" },
        },
        dist: "42",
        environment: "production",
        event_id: "event-1",
        exception: {
          values: [
            {
              mechanism: { handled: true, type: "generic" },
              stacktrace: {
                frames: [
                  {
                    abs_path: "https://halaalvest.test/members/member-1",
                    colno: 18,
                    context_line: "throw new Error(member.email)",
                    filename:
                      "https://cdn.test/_next/static/chunks/app.js?member=member-1",
                    function: "saveContribution",
                    lineno: 72,
                    module: "contributions",
                    vars: { memberEmail: "member@example.test" },
                  },
                ],
              },
              type: "PrismaClientKnownRequestError",
              value: "Prisma failed for member member-1",
            },
          ],
        },
        extra: {
          attempt: 2,
          memberId: "member-1",
          runId: "run-1",
        },
        fingerprint: ["DATABASE_TRANSACTION_TIMEOUT", "contributions.record"],
        level: "error",
        message: "Member member-1 contribution failed",
        platform: "javascript",
        release: "release-1",
        request: {
          data: { contributionAmount: 5000 },
          headers: { authorization: "Bearer secret" },
          method: "POST",
          url: "https://api.test/members/member-1",
        },
        spans: [{ description: "POST /members/member-1" }],
        tags: {
          error_category: "database",
          error_code: "DATABASE_TRANSACTION_TIMEOUT",
          error_reference: "ERR-SAFE01",
          member_id: "member-1",
          method: "POST",
          operation: "contributions.record",
          retryable: "true",
          runtime: "api",
          source: "trpc",
        },
        timestamp: 1_700_000_000,
        transaction: "/members/member-1",
        user: { email: "member@example.test", id: "member-1" },
      },
      {
        allowedExtraKeys: ["attempt", "runId"],
        allowedTagKeys: ["method"],
      }
    )

    expect(event).toEqual({
      dist: "42",
      environment: "production",
      event_id: "event-1",
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  colno: 18,
                  filename: "/_next/static/chunks/app.js",
                  function: "saveContribution",
                  lineno: 72,
                  module: "contributions",
                },
              ],
            },
            type: "PrismaClientKnownRequestError",
            value: "Captured DATABASE_TRANSACTION_TIMEOUT",
          },
        ],
      },
      extra: { attempt: 2, runId: "run-1" },
      fingerprint: ["DATABASE_TRANSACTION_TIMEOUT", "contributions.record"],
      level: "error",
      platform: "javascript",
      release: "release-1",
      tags: {
        error_category: "database",
        error_code: "DATABASE_TRANSACTION_TIMEOUT",
        error_reference: "ERR-SAFE01",
        method: "POST",
        operation: "contributions.record",
        retryable: "true",
        runtime: "api",
        source: "trpc",
      },
      timestamp: 1_700_000_000,
    })
    expect(JSON.stringify(event)).not.toContain("member-1")
    expect(JSON.stringify(event)).not.toContain("member@example.test")
    expect(JSON.stringify(event)).not.toContain("Bearer secret")
  })

  test("enables private source maps only with complete production credentials", () => {
    expect(
      getSourceMapUploadConfig({
        authToken: "token",
        environment: "production",
        org: "halaalvest",
        project: "halaalvest-api",
        release: "release-1",
      })
    ).toEqual({
      authToken: "token",
      org: "halaalvest",
      project: "halaalvest-api",
      release: "release-1",
    })
    expect(
      getSourceMapUploadConfig({
        environment: "production",
        org: "halaalvest",
        project: "halaalvest-api",
      })
    ).toBeNull()
    expect(
      getSourceMapUploadConfig({
        authToken: "token",
        environment: "preview",
        org: "halaalvest",
        project: "halaalvest-api",
      })
    ).toBeNull()
  })
})
