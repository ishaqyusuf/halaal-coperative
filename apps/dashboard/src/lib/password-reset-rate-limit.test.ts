import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import {
  allowPasswordResetEmail,
  getPasswordResetNetworkSignal,
  PASSWORD_RESET_EMAIL_LIMITS,
} from "./password-reset-rate-limit"

const hash = (value: string) => `hash:${value}`

describe("password reset email rate limit", () => {
  test("limits per account and per network inside the tenant", async () => {
    let received:
      | Parameters<typeof import("@halaalvest/db").enforceAuthRateLimits>[0]
      | undefined
    const allowed = await allowPasswordResetEmail(
      {
        headers: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
        tenantId: "tenant-1",
        userId: "user-1",
      },
      {
        enforce: async (input) => {
          received = input
          return { allowed: true as const }
        },
        hash,
      }
    )

    expect(allowed).toBe(true)
    expect(received?.tenantId).toBe("tenant-1")
    expect(received?.rules).toEqual([
      {
        limit: PASSWORD_RESET_EMAIL_LIMITS.account,
        signalHash: "hash:user:user-1",
        signalType: "account",
        windowMs: PASSWORD_RESET_EMAIL_LIMITS.windowMs,
      },
      {
        limit: PASSWORD_RESET_EMAIL_LIMITS.network,
        signalHash: "hash:network:203.0.113.9",
        signalType: "network",
        windowMs: PASSWORD_RESET_EMAIL_LIMITS.windowMs,
      },
    ])
  })

  test("skips the email quietly once a limit is exceeded", async () => {
    const allowed = await allowPasswordResetEmail(
      { headers: new Headers(), tenantId: "tenant-1", userId: "user-1" },
      {
        enforce: async () => {
          throw new AppError({
            code: "RATE_LIMITED",
            internalMessage: "Rate limit exceeded for account.",
          })
        },
        hash,
      }
    )

    expect(allowed).toBe(false)
  })

  test("does not hide other failures", async () => {
    await expect(
      allowPasswordResetEmail(
        { headers: new Headers(), tenantId: "tenant-1", userId: "user-1" },
        {
          enforce: async () => {
            throw new Error("database unavailable")
          },
          hash,
        }
      )
    ).rejects.toThrow("database unavailable")
  })

  test("prefers trusted proxy headers for the network signal", () => {
    expect(
      getPasswordResetNetworkSignal(
        new Headers({
          "x-real-ip": "198.51.100.4",
          "x-forwarded-for": "1.1.1.1",
        })
      )
    ).toBe("198.51.100.4")
    expect(getPasswordResetNetworkSignal(new Headers())).toBe("unavailable")
  })
})
