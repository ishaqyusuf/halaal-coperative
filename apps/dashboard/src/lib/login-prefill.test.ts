import { describe, expect, test } from "bun:test"
import { NextRequest, NextResponse } from "next/server"
import { GET } from "@/app/auth/login-prefill/route"
import {
  clearLoginPrefillCookie,
  handleLoginPrefillPost,
  LOGIN_PREFILL_COOKIE,
  LOGIN_PREFILL_MAX_AGE_SECONDS,
  normalizeLoginPrefillCode,
  type LoginPrefillDeps,
} from "./login-prefill"

const tenantHost = "amana-story.halaalvest-dash.localhost"

function prefillRequest({
  identifier,
  method = "POST",
}: { identifier?: string | null; method?: string } = {}) {
  const body = new FormData()
  if (identifier != null) body.set("identifier", identifier)
  return new NextRequest(`https://${tenantHost}/auth/login-prefill`, {
    ...(method === "POST" ? { body } : {}),
    headers: {
      host: tenantHost,
      "x-forwarded-host": tenantHost,
      "x-forwarded-proto": "https",
    },
    method,
  })
}

const deps: LoginPrefillDeps = {
  resolveTenantAsync: async () => ({
    tenant: { cooperativeCodePrefix: "AMS" },
  }),
}

describe("normalizeLoginPrefillCode", () => {
  test("accepts this cooperative's member codes, normalized", () => {
    expect(normalizeLoginPrefillCode("ams-0001", "AMS")).toBe("AMS-0001")
    expect(normalizeLoginPrefillCode(" AMS 12 ", "AMS")).toBe("AMS-12")
  })

  test("rejects other prefixes, emails, junk and a missing prefix", () => {
    expect(normalizeLoginPrefillCode("OPA-0001", "AMS")).toBeNull()
    expect(normalizeLoginPrefillCode("aisha@onepath.qa.test", "AMS")).toBeNull()
    expect(normalizeLoginPrefillCode("AMS", "AMS")).toBeNull()
    expect(normalizeLoginPrefillCode("AMS-0001", null)).toBeNull()
    expect(normalizeLoginPrefillCode(`AMS-${"1".repeat(50)}`, "AMS")).toBeNull()
    expect(normalizeLoginPrefillCode(undefined, "AMS")).toBeNull()
  })
})

describe("POST /auth/login-prefill", () => {
  test("stores this cooperative's code in a short-lived /login cookie", async () => {
    const response = await handleLoginPrefillPost(
      prefillRequest({ identifier: "ams-0001" }),
      deps
    )
    const cookie = response.cookies.get(LOGIN_PREFILL_COOKIE)

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`https://${tenantHost}/login`)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(cookie?.value).toBe("AMS-0001")
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.path).toBe("/login")
    expect(cookie?.sameSite).toBe("lax")
    expect(cookie?.secure).toBe(true)
    expect(cookie?.maxAge).toBe(LOGIN_PREFILL_MAX_AGE_SECONDS)
  })

  test("gives the same redirect with no cookie for anything else", async () => {
    for (const identifier of ["OPA-0001", "not a code", null]) {
      const response = await handleLoginPrefillPost(
        prefillRequest({ identifier }),
        deps
      )

      expect(response.status).toBe(303)
      expect(response.headers.get("location")).toBe(
        `https://${tenantHost}/login`
      )
      expect(response.cookies.get(LOGIN_PREFILL_COOKIE)).toBeUndefined()
    }
  })

  test("sets no cookie off a tenant host", async () => {
    const response = await handleLoginPrefillPost(
      prefillRequest({ identifier: "AMS-0001" }),
      { resolveTenantAsync: async () => ({ tenant: null }) }
    )

    expect(response.status).toBe(303)
    expect(response.cookies.get(LOGIN_PREFILL_COOKIE)).toBeUndefined()
  })

  test("GET just redirects to /login", () => {
    const response = GET(prefillRequest({ method: "GET" }))

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`https://${tenantHost}/login`)
    expect(response.cookies.get(LOGIN_PREFILL_COOKIE)).toBeUndefined()
  })
})

describe("clearLoginPrefillCookie", () => {
  test("expires the /login prefill cookie", () => {
    const response = clearLoginPrefillCookie(
      NextResponse.redirect(`https://${tenantHost}/`)
    )
    const cookie = response.cookies.get(LOGIN_PREFILL_COOKIE)

    expect(cookie?.value).toBe("")
    expect(cookie?.maxAge).toBe(0)
    expect(cookie?.path).toBe("/login")
  })
})
