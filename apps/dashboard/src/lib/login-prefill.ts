import { normalizeCooperativeAccessCode } from "@halaalvest/utils"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { getPublicRequestHost } from "@/lib/request-host"

/**
 * Marketing "Sign in" finds a cooperative from a member code, then
 * top-level POSTs the code here so the tenant's /login opens with it filled
 * in. The code never travels in a URL: it is held in a short-lived httpOnly
 * cookie scoped to /login, and only when its prefix is this cooperative's.
 * Every request gets the same redirect, so the route is not an oracle.
 */

export const LOGIN_PREFILL_COOKIE = "halaalvest_login_prefill"
export const LOGIN_PREFILL_MAX_AGE_SECONDS = 5 * 60

const memberCodePattern = /^([A-Z]{3,5})-([A-Z0-9]{1,20})$/

export type LoginPrefillDeps = {
  resolveTenantAsync: (input: {
    hostname: string | null
    slug: string | null
  }) => Promise<{
    tenant: { cooperativeCodePrefix?: string | null } | null
  }>
}

/** The normalized member code when it belongs to this cooperative, else null. */
export function normalizeLoginPrefillCode(
  value: unknown,
  cooperativeCodePrefix: string | null | undefined
) {
  if (typeof value !== "string" || value.length > 40 || !cooperativeCodePrefix)
    return null

  const code = normalizeCooperativeAccessCode(value)
  const match = memberCodePattern.exec(code)

  return match?.[1] === cooperativeCodePrefix.trim().toUpperCase() ? code : null
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
