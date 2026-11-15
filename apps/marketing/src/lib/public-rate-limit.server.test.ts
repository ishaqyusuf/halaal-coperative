import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import { handleSignupAvailabilityRequest } from "../../app/api/signup/availability/route"
import { handleWorkspaceSignInRequest } from "../../app/api/workspace-sign-in/route"
import {
  createMarketingRateLimiter,
  getRequestNetworkSignal,
  MARKETING_PUBLIC_RATE_LIMITS,
  type MarketingRateLimiter,
} from "./public-rate-limit.server"

type EnforceInput = {
  operation: string
  rules: { limit: number; signalHash: string; signalType: string }[]
}

function recordingLimiter() {
  const calls: EnforceInput[] = []
  const limiter = createMarketingRateLimiter(
    async (input) => {
      calls.push(input as EnforceInput)
      return { allowed: true as const }
    },
    () => true
  )
  return { calls, limiter }
}

const limited: MarketingRateLimiter = async () => {
  throw new AppError({ code: "RATE_LIMITED" })
}

describe("marketing public rate limits", () => {
  test("caps the email address and the network for email-sending routes", async () => {
    const { calls, limiter } = recordingLimiter()
    await limiter({
      email: "Admin@Example.test",
      headers: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
      operation: "signup_verification",
    })
    await limiter({
      email: "admin@example.test",
      headers: new Headers({ "x-forwarded-for": "203.0.113.9" }),
      operation: "signup_verification",
    })

    expect(calls[0]?.operation).toBe("marketing_signup_verification")
    expect(
      calls[0]?.rules.map((rule) => [rule.signalType, rule.limit])
    ).toEqual([
      ["network", MARKETING_PUBLIC_RATE_LIMITS.signup_verification.network],
      ["account", MARKETING_PUBLIC_RATE_LIMITS.signup_verification.email],
    ])
    // Same person and network land in the same buckets; nothing is stored raw.
    expect(calls[1]?.rules).toEqual(calls[0]!.rules)
    expect(JSON.stringify(calls)).not.toContain("example.test")
    expect(JSON.stringify(calls)).not.toContain("203.0.113.9")
  })

  test("caps lookups by network only", async () => {
    const { calls, limiter } = recordingLimiter()
    await limiter({ headers: new Headers(), operation: "workspace_sign_in" })
    await limiter({ headers: new Headers(), operation: "signup_availability" })

    expect(
      calls.map((call) => call.rules.map((rule) => rule.signalType))
    ).toEqual([["network"], ["network"]])
  })

  test("prefers the edge-provided client address", () => {
    expect(
      getRequestNetworkSignal(
        new Headers({
          "cf-connecting-ip": "198.51.100.1",
          "x-forwarded-for": "203.0.113.9",
        })
      )
    ).toBe("198.51.100.1")
    expect(getRequestNetworkSignal(new Headers())).toBe("unavailable")
  })

  test("skips the check locally when no database is configured", async () => {
    let called = false
    const limiter = createMarketingRateLimiter(
      async () => {
        called = true
        return { allowed: true as const }
      },
      () => false
    )
    await limiter({ headers: new Headers(), operation: "workspace_sign_in" })
    expect(called).toBe(false)
  })

  test("a limited availability check answers 429 before any lookup", async () => {
    let looked = false
    const response = await handleSignupAvailabilityRequest(
      new Request(
        "https://halaalvest.localhost/api/signup/availability?workspaceSlug=amana"
      ),
      async () => {
        looked = true
        throw new Error("not reached")
      },
      limited
    )
    expect(response.status).toBe(429)
    expect(looked).toBe(false)
  })

  test("a limited workspace sign-in answers 429 before any lookup", async () => {
    let looked = false
    const lookup = async () => {
      looked = true
      return null
    }
    const response = await handleWorkspaceSignInRequest(
      new Request("https://halaalvest.localhost/api/workspace-sign-in", {
        body: JSON.stringify({ workspace: "amana-savings" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      { findByPrefix: lookup, findBySlug: lookup },
      limited
    )
    expect(response.status).toBe(429)
    expect(looked).toBe(false)
  })
})
