import { createHmac } from "node:crypto"
import { createDbRuntime, enforceAuthRateLimits } from "@halaalvest/db"
import { getSignupTokenSecret } from "./signup-token"

const minute = 60_000

/**
 * Public marketing routes that send email or look up cooperatives. Limits use
 * the shared database buckets (`auth_rate_limit_buckets`), so they hold
 * across serverless instances. Each limited request adds one short
 * transaction (expired-bucket cleanup plus one upsert per rule).
 *
 * - signup sends a paid email to the address typed in, so cap both that
 *   address and the network.
 * - workspace sign-in and signup availability confirm whether a cooperative
 *   exists; cap each network so the directory can't be walked.
 *   Availability runs while someone types (350 ms debounce), so its cap is
 *   wider than a person can reach.
 */
export const MARKETING_PUBLIC_RATE_LIMITS = {
  signup_availability: { network: 60, windowMs: 5 * minute },
  signup_verification: { email: 3, network: 10, windowMs: 15 * minute },
  workspace_sign_in: { network: 30, windowMs: 5 * minute },
} as const satisfies Record<
  string,
  { email?: number; network: number; windowMs: number }
>

export type MarketingPublicRateLimitOperation =
  keyof typeof MARKETING_PUBLIC_RATE_LIMITS

export function getRequestNetworkSignal(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unavailable"
  )
}

function hashSignal(value: string) {
  // Keyed, so stored buckets don't reveal addresses or emails.
  return createHmac("sha256", getSignupTokenSecret())
    .update(`marketing-rate-limit:${value.trim().toLowerCase()}`)
    .digest("hex")
}

export type MarketingRateLimiter = (input: {
  email?: string
  headers: Headers
  operation: MarketingPublicRateLimitOperation
}) => Promise<void>

/**
 * Throws `RATE_LIMITED` (HTTP 429 through the marketing error response) when
 * a limit is passed. Local runs without a database skip the check; in
 * production the database is required, as for signup itself.
 */
export function createMarketingRateLimiter(
  enforce: typeof enforceAuthRateLimits = enforceAuthRateLimits,
  databaseConfigured = () => createDbRuntime().status === "database-configured"
): MarketingRateLimiter {
  return async ({ email, headers, operation }) => {
    if (process.env.NODE_ENV !== "production" && !databaseConfigured()) {
      return
    }

    const limits: {
      email?: number
      network: number
      windowMs: number
    } = MARKETING_PUBLIC_RATE_LIMITS[operation]
    await enforce({
      operation: `marketing_${operation}`,
      rules: [
        {
          limit: limits.network,
          signalHash: hashSignal(`network:${getRequestNetworkSignal(headers)}`),
          signalType: "network",
          windowMs: limits.windowMs,
        },
        ...(limits.email && email
          ? [
              {
                limit: limits.email,
                signalHash: hashSignal(`email:${email}`),
                signalType: "account" as const,
                windowMs: limits.windowMs,
              },
            ]
          : []),
      ],
    })
  }
}

export const enforceMarketingRateLimit = createMarketingRateLimiter()
