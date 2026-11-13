import { hashAuthRateLimitSignal } from "@halaalvest/auth"
import { enforceAuthRateLimits } from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"

// Each password reset request sends a paid email to a real inbox. Without a
// cap, repeated posts both run up provider usage and flood the account owner.
export const PASSWORD_RESET_EMAIL_LIMITS = {
  account: 3,
  network: 10,
  windowMs: 15 * 60_000,
} as const

export function getPasswordResetNetworkSignal(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unavailable"
  )
}

type Dependencies = {
  enforce: typeof enforceAuthRateLimits
  hash: typeof hashAuthRateLimitSignal
}

/**
 * Returns false when this reset email should be skipped. The caller still shows
 * the neutral "sent" screen, so a limit never reveals whether an account exists.
 */
export async function allowPasswordResetEmail(
  input: { headers: Headers; tenantId: string; userId: string },
  dependencies: Dependencies = {
    enforce: enforceAuthRateLimits,
    hash: hashAuthRateLimitSignal,
  }
) {
  try {
    await dependencies.enforce({
      operation: "dashboard_password_reset_email",
      rules: [
        {
          limit: PASSWORD_RESET_EMAIL_LIMITS.account,
          signalHash: dependencies.hash(`user:${input.userId}`),
          signalType: "account",
          windowMs: PASSWORD_RESET_EMAIL_LIMITS.windowMs,
        },
        {
          limit: PASSWORD_RESET_EMAIL_LIMITS.network,
          signalHash: dependencies.hash(
            `network:${getPasswordResetNetworkSignal(input.headers)}`
          ),
          signalType: "network",
          windowMs: PASSWORD_RESET_EMAIL_LIMITS.windowMs,
        },
      ],
      tenantId: input.tenantId,
    })
    return true
  } catch (error) {
    if (error instanceof AppError && error.code === "RATE_LIMITED") return false
    throw error
  }
}
