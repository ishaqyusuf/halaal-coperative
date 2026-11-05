import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test"
import {
  createSignedSessionToken,
  getScopedAuthSessionCookieName,
} from "@halaalvest/auth"
import * as React from "react"

// React `cache()` memoizes only inside a server request. This stand-in does
// the same: calls share one store while a request is open, and pass through
// outside one, so other test files keep React's usual behaviour.
type RequestScope = {
  cookieHeader: string
  headers: Headers
  store: Map<unknown, Map<string, unknown>>
}

let activeRequest: RequestScope | null = null

function requestCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
) {
  return (...args: Args): Result => {
    if (!activeRequest) return fn(...args)
    const entries = activeRequest.store.get(fn) ?? new Map<string, unknown>()
    activeRequest.store.set(fn, entries)
    const key = JSON.stringify(args)
    if (!entries.has(key)) entries.set(key, fn(...args))
    return entries.get(key) as Result
  }
}

function requireRequest() {
  if (!activeRequest) throw new Error("next/headers read outside a request")
  return activeRequest
}

mock.module("react", () => ({ ...React, cache: requestCache }))
mock.module("next/headers", () => ({
  cookies: async () => ({ toString: () => requireRequest().cookieHeader }),
  headers: async () => requireRequest().headers,
}))

const host = "barakah.halaalvest-dash.localhost"
const scope = "barakah"
const tenantId = "7d0c4f3e-6a51-4c1e-9e0a-2f6b1d1a9c01"
const userId = "5b8e2a10-3c4d-4e5f-8a9b-0c1d2e3f4a5b"

const tenantRow = {
  city: null,
  cooperativeCodePrefix: "BRK",
  country: null,
  currencyCode: "NGN",
  currentSize: null,
  dataClassification: "live",
  id: tenantId,
  memberNumberPrefix: null,
  name: "Barakah Cooperative",
  officeAddress: null,
  qaPurgeStartedAt: null,
  region: null,
  slug: "barakah",
  startDate: null,
  state: null,
  status: "active",
  timezone: "Africa/Lagos",
  _count: { members: 12 },
}

/**
 * A Prisma stand-in that counts every delegate call. Context lookups get
 * realistic rows; anything else gets an empty result of the right shape.
 */
function createCountingPrisma() {
  const calls: Array<{ args: unknown; method: string; model: string }> = []
  const known: Record<string, Record<string, (args: unknown) => unknown>> = {
    membership: {
      findMany: () => [
        {
          id: "membership-1",
          isDefault: true,
          role: "finance_officer",
          tenantId,
          userId,
        },
      ],
    },
    memberOnboardingRequest: { findFirst: () => null },
    tenant: {
      findUnique: () => ({
        ...tenantRow,
        chargeDefinitions: [],
        domains: [],
        ledgerAccounts: [],
        memberships: [],
        users: [],
      }),
    },
    user: {
      findFirst: () => ({
        email: "finance@barakah.test",
        fullName: "Barakah Finance",
        id: userId,
        isPlatformOwner: false,
        tenantId,
      }),
    },
  }
  const emptyResult = (method: string) => {
    if (method === "count") return 0
    if (method === "aggregate") return { _count: {}, _sum: {} }
    if (method.startsWith("findMany") || method === "groupBy") return []
    return null
  }
  const prisma = new Proxy(
    {},
    {
      get(_target, model: string) {
        if (model === "then") return undefined
        if (model.startsWith("$")) return async () => []
        return new Proxy(
          {},
          {
            get(_delegate, method: string) {
              return async (args: unknown) => {
                calls.push({ args, method, model })
                return (known[model]?.[method] ?? (() => emptyResult(method)))(
                  args
                )
              }
            },
          }
        )
      },
    }
  )

  return { calls, prisma }
}

async function runRequest<T>(cookieHeader: string, work: () => Promise<T>) {
  activeRequest = {
    cookieHeader,
    headers: new Headers({ host, "x-tenant-subdomain": "barakah" }),
    store: new Map(),
  }
  try {
    return await work()
  } finally {
    activeRequest = null
  }
}

function countBy(
  calls: Array<{ method: string; model: string }>,
  model: string,
  method: string
) {
  return calls.filter((call) => call.model === model && call.method === method)
    .length
}

const globalForPrisma = globalThis as typeof globalThis & {
  __halaalVestPrisma?: unknown
}

describe("dashboard server context", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const originalPrisma = globalForPrisma.__halaalVestPrisma
  let counting: ReturnType<typeof createCountingPrisma>

  beforeAll(() => {
    process.env.HALAALVEST_DATABASE_URL = "postgres://stub/halaalvest"
    counting = createCountingPrisma()
    globalForPrisma.__halaalVestPrisma = counting.prisma
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
    } else {
      delete process.env.HALAALVEST_DATABASE_URL
    }
    globalForPrisma.__halaalVestPrisma = originalPrisma
  })

  test("resolves the context once per request across every caller", async () => {
    const {
      getDashboardPageData,
      getDashboardServerContext,
      getRequestQaQuickFillContext,
    } = await import("./server-context")
    const token = await createSignedSessionToken({ scope, userId })
    const cookieHeader = `${getScopedAuthSessionCookieName(scope)}=${token}`

    const contexts = await runRequest(cookieHeader, async () => {
      // Root layout, sidebar layout, page, loader and page data in parallel.
      const [, ...resolved] = await Promise.all([
        getRequestQaQuickFillContext(),
        getDashboardServerContext(),
        getDashboardServerContext(),
        getDashboardServerContext(),
        getDashboardPageData().then(() => getDashboardServerContext()),
      ])
      return resolved
    })

    expect(new Set(contexts).size).toBe(1)
    expect(contexts[0]?.auth.user?.id).toBe(userId)
    expect(contexts[0]?.auth.membership?.role).toBe("finance_officer")
    expect(contexts[0]?.tenant?.memberCount).toBe(12)
    expect(countBy(counting.calls, "user", "findFirst")).toBe(1)
    // Page data also reads the tenant for onboarding; the context lookup
    // is the slug lookup.
    const tenantSlugLookups = counting.calls.filter(
      (call) =>
        call.model === "tenant" &&
        call.method === "findUnique" &&
        (call.args as { where?: { slug?: string } }).where?.slug === "barakah"
    )
    expect(tenantSlugLookups).toHaveLength(1)
    expect(countBy(counting.calls, "membership", "findMany")).toBe(1)
    expect(
      countBy(counting.calls, "memberOnboardingRequest", "findFirst")
    ).toBe(1)

    expect(
      (tenantSlugLookups[0]?.args as { include?: Record<string, unknown> })
        .include
    ).toEqual({
      _count: { select: { members: true } },
    })

    // A second request resolves again: the cache never spans requests.
    await runRequest(cookieHeader, () => getDashboardServerContext())
    expect(countBy(counting.calls, "user", "findFirst")).toBe(2)
  })

  test("the root layout resolves no user, tenant or membership", async () => {
    const { getRequestQaQuickFillContext } = await import("./server-context")
    const token = await createSignedSessionToken({ scope, userId })
    const before = counting.calls.length

    const quickFill = await runRequest(
      `${getScopedAuthSessionCookieName(scope)}=${token}`,
      () => getRequestQaQuickFillContext()
    )

    expect(quickFill.enabled).toBe(false)
    expect(counting.calls.length).toBe(before)
  })

  test("an unsigned cookie resolves no user", async () => {
    const { getDashboardServerContext } = await import("./server-context")
    const before = countBy(counting.calls, "user", "findFirst")

    const context = await runRequest(
      `${getScopedAuthSessionCookieName(scope)}=not-a-signed-token`,
      () => getDashboardServerContext()
    )

    expect(context.auth.user).toBeNull()
    expect(context.auth.sessionToken).toBeNull()
    expect(context.auth.membership).toBeNull()
    expect(countBy(counting.calls, "user", "findFirst")).toBe(before)
  })
})
