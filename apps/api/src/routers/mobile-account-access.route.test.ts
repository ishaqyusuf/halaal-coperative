import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import {
  getPublicAuthRateLimitRules,
  neutralRecoveryResponse,
  projectRecoveryRequestResponse,
  shouldNeutralizeRecoveryRateLimit,
} from "./mobile-account-access.route"

describe("mobile password recovery public contract", () => {
  test("keeps known and unknown production responses enumeration-neutral", () => {
    const known = projectRecoveryRequestResponse({
      challengeId: "11111111-1111-4111-8111-111111111111",
      devCode: "431902",
      exposeDevCode: false,
    })
    const unknown = projectRecoveryRequestResponse({
      challengeId: "22222222-2222-4222-8222-222222222222",
      exposeDevCode: false,
    })

    expect({ ...known, challengeId: null }).toEqual({
      ...unknown,
      challengeId: null,
    })
    expect(known).toMatchObject(neutralRecoveryResponse)
    expect(known).not.toHaveProperty("devCode")
    expect(unknown).not.toHaveProperty("devCode")
  })

  test("exposes the bounded OTP only through an explicit development seam", () => {
    expect(
      projectRecoveryRequestResponse({
        challengeId: "11111111-1111-4111-8111-111111111111",
        devCode: "431902",
        exposeDevCode: true,
      })
    ).toMatchObject({ devCode: "431902" })
  })

  test("limits public auth by account, device, network, and resolved tenant", () => {
    const rules = getPublicAuthRateLimitRules({
      account: "HAL-S-ZAINAB01",
      device: "device-qa-001",
      network: "network-qa-001",
      tenantId: "tenant-qa-001",
    })

    expect(rules.map((rule) => [rule.signalType, rule.limit])).toEqual([
      ["account", 6],
      ["device", 20],
      ["network", 40],
      ["tenant", 120],
    ])
    expect(new Set(rules.map((rule) => rule.signalHash)).size).toBe(4)
    expect(rules.every((rule) => rule.windowMs === 15 * 60 * 1000)).toBe(true)
  })

  test("neutralizes only tenant recovery throttling without hiding other failures", () => {
    expect(
      shouldNeutralizeRecoveryRateLimit(
        new AppError({
          code: "RATE_LIMITED",
          internalMessage: "Tenant recovery bucket exceeded.",
        })
      )
    ).toBe(true)
    expect(
      shouldNeutralizeRecoveryRateLimit(
        new AppError({
          code: "UNEXPECTED",
          internalMessage: "Database unavailable.",
        })
      )
    ).toBe(false)
    expect(shouldNeutralizeRecoveryRateLimit(new Error("rate limited"))).toBe(
      false
    )
  })
})
