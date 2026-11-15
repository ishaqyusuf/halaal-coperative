import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import { NextRequest, NextResponse } from "next/server"
import { GET } from "@/app/auth/login-prefill/route"
import {
  allowLoginPrefill,
  clearLoginPrefillCookie,
  handleLoginPrefillPost,
  LOGIN_PREFILL_COOKIE,
  LOGIN_PREFILL_MAX_AGE_SECONDS,
  LOGIN_PREFILL_RATE_LIMIT,
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
  allowPrefill: async () => true,
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
      { ...deps, resolveTenantAsync: async () => ({ tenant: null }) }
    )

    expect(response.status).toBe(303)
    expect(response.cookies.get(LOGIN_PREFILL_COOKIE)).toBeUndefined()
  })

  test("over the limit: same redirect, no cookie, no tenant lookup", async () => {
    let tenantLookups = 0
    const response = await handleLoginPrefillPost(
      prefillRequest({ identifier: "AMS-0001" }),
      {
        allowPrefill: async () => false,
        resolveTenantAsync: async () => {
          tenantLookups += 1
          return { tenant: { cooperativeCodePrefix: "AMS" } }
        },
      }
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`https://${tenantHost}/login`)
    expect(response.cookies.get(LOGIN_PREFILL_COOKIE)).toBeUndefined()
    expect(tenantLookups).toBe(0)
  })

  test("input that is not a member code never reaches the database", async () => {
    let calls = 0
    const counting: LoginPrefillDeps = {
      allowPrefill: async () => {
        calls += 1
        return true
      },
      resolveTenantAsync: async () => {
        calls += 1
        return { tenant: { cooperativeCodePrefix: "AMS" } }
      },
    }

    for (const identifier of [
      "aisha@onepath.qa.test",
      "AMS",
      "x".repeat(41),
      null,
    ]) {
      await handleLoginPrefillPost(prefillRequest({ identifier }), counting)
    }

    expect(calls).toBe(0)
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

describe("allowLoginPrefill", () => {
  const forwarded = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })

  test("counts one network bucket per request", async () => {
    const calls: unknown[] = []
    const allowed = await allowLoginPrefill(forwarded, {
      enforce: async (input) => {
        calls.push(input)
        return { allowed: true as const }
      },
      hash: (value) => `hash(${value})`,
    })

    expect(allowed).toBe(true)
    expect(calls).toEqual([
      {
        operation: "dashboard_login_prefill",
        rules: [
          {
            limit: LOGIN_PREFILL_RATE_LIMIT.network,
            signalHash: "hash(network:203.0.113.7)",
            signalType: "network",
            windowMs: LOGIN_PREFILL_RATE_LIMIT.windowMs,
          },
        ],
      },
    ])
  })

  test("returns false over the limit and rethrows anything else", async () => {
    const hash = (value: string) => value
    const limited = () =>
      Promise.reject(
        new AppError({ code: "RATE_LIMITED", operation: "test" })
      ) as never
    const broken = () => Promise.reject(new Error("database down")) as never

    expect(await allowLoginPrefill(forwarded, { enforce: limited, hash })).toBe(
      false
    )
    await expect(
      allowLoginPrefill(forwarded, { enforce: broken, hash })
    ).rejects.toThrow("database down")
  })
})
