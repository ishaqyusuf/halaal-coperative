import { hashAuthRateLimitSignal } from "@halaalvest/auth"
import { enforceAuthRateLimits } from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import { normalizeCooperativeAccessCode } from "@halaalvest/utils"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { getPasswordResetNetworkSignal } from "@/lib/password-reset-rate-limit"
import { getPublicRequestHost } from "@/lib/request-host"

/**
 * Marketing "Sign in" finds a cooperative from a member code, then
 * top-level POSTs the code here so the tenant's /login opens with it filled
 * in. The code never travels in a URL: it is held in a short-lived httpOnly
 * cookie scoped to /login, and only when its prefix is this cooperative's.
 * Every request gets the same redirect, so the route is not an oracle.
 *
 * Rate limit: a person posts here once per sign-in, so each network gets
 * LOGIN_PREFILL_RATE_LIMIT prefills per window in the shared database buckets
 * (keyed by HMAC, so no IP is stored). Over the limit the code is simply not
 * filled in; the response is unchanged. Input that is not shaped like a member
 * code is dropped before any database work.
 */

export const LOGIN_PREFILL_COOKIE = "halaalvest_login_prefill"
export const LOGIN_PREFILL_MAX_AGE_SECONDS = 5 * 60
export const LOGIN_PREFILL_RATE_LIMIT = {
  network: 20,
  windowMs: 5 * 60_000,
} as const

const memberCodePattern = /^([A-Z]{3,5})-([A-Z0-9]{1,20})$/

export type LoginPrefillDeps = {
  /** Resolves false when this network is over the prefill limit. */
  allowPrefill: (headers: Headers) => Promise<boolean>
  resolveTenantAsync: (input: {
    hostname: string | null
    slug: string | null
  }) => Promise<{
    tenant: { cooperativeCodePrefix?: string | null } | null
  }>
}

/** The normalized code when it is shaped like any member code, else null. */
function parseMemberCode(value: unknown) {
  if (typeof value !== "string" || value.length > 40) return null
  const code = normalizeCooperativeAccessCode(value)
  return memberCodePattern.test(code) ? code : null
}

/** The normalized member code when it belongs to this cooperative, else null. */
export function normalizeLoginPrefillCode(
  value: unknown,
  cooperativeCodePrefix: string | null | undefined
) {
  const code = parseMemberCode(value)
  if (!code || !cooperativeCodePrefix) return null

  return code.split("-")[0] === cooperativeCodePrefix.trim().toUpperCase()
    ? code
    : null
}

export async function allowLoginPrefill(
  headers: Headers,
  dependencies: {
    enforce: typeof enforceAuthRateLimits
    hash: typeof hashAuthRateLimitSignal
  } = { enforce: enforceAuthRateLimits, hash: hashAuthRateLimitSignal }
) {
  try {
    await dependencies.enforce({
      operation: "dashboard_login_prefill",
      rules: [
        {
          limit: LOGIN_PREFILL_RATE_LIMIT.network,
          signalHash: dependencies.hash(
            `network:${getPasswordResetNetworkSignal(headers)}`
          ),
          signalType: "network",
          windowMs: LOGIN_PREFILL_RATE_LIMIT.windowMs,
        },
      ],
    })
    return true
  } catch (error) {
    if (error instanceof AppError && error.code === "RATE_LIMITED") return false
    throw error
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(
    buildDashboardRedirectUrl(request, "/login"),
    303
  )
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}

export async function handleLoginPrefillPost(
  request: NextRequest,
  deps: LoginPrefillDeps
) {
  const response = redirectToLogin(request)

  let identifier: FormDataEntryValue | null = null
  try {
    identifier = (await request.formData()).get("identifier")
  } catch {
    return response
  }

  // No database work for input that can't be a member code.
  if (!parseMemberCode(identifier)) return response
  if (!(await deps.allowPrefill(request.headers))) return response

  const host = getPublicRequestHost(request.headers)
  const { tenant } = await deps.resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })
  const code = normalizeLoginPrefillCode(
    identifier,
    tenant?.cooperativeCodePrefix
  )

  if (code) {
    response.cookies.set(LOGIN_PREFILL_COOKIE, code, {
      httpOnly: true,
      maxAge: LOGIN_PREFILL_MAX_AGE_SECONDS,
      path: "/login",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    })
  }

  return response
}

/** Drop the prefill once the member has signed in (shared computers). */
export function clearLoginPrefillCookie(response: NextResponse) {
  response.cookies.set(LOGIN_PREFILL_COOKIE, "", { maxAge: 0, path: "/login" })
  return response
}

export function redirectLoginPrefillToLogin(request: NextRequest) {
  return redirectToLogin(request)
}
