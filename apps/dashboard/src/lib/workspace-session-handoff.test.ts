import { describe, expect, test } from "bun:test"
import { verifySignedSessionToken } from "@halaalvest/auth"
import { NextRequest } from "next/server"
import { GET } from "@/app/auth/handoff/route"
import {
  handleWorkspaceSessionHandoffPost,
  type WorkspaceSessionHandoffDeps,
} from "./workspace-session-handoff"

const tenantSlug = "kaduna-reliable-health-workers-society-723"
const tenantHost = `${tenantSlug}.halaalvest-dash.localhost`
const tenantId = "tenant-kaduna"
const userId = "user-owner"

function handoffRequest({
  host = tenantHost,
  method = "POST",
  token = "valid-token",
}: { host?: string; method?: string; token?: string | null } = {}) {
  const body = new FormData()
  if (token !== null) body.set("token", token)
  return new NextRequest(`https://${host}/auth/handoff`, {
    ...(method === "POST" ? { body } : {}),
    headers: {
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
    },
    method,
  })
}

function createDeps(overrides: Partial<WorkspaceSessionHandoffDeps> = {}) {
  const consumed = new Set<string>()
  const calls: string[] = []
  const deps: WorkspaceSessionHandoffDeps = {
    consumeWorkspaceSessionHandoff: async (input) => {
      calls.push(`consume:${input.tenantId}`)
      if (input.token !== "valid-token" || input.tenantId !== tenantId) {
        return null
      }
      if (consumed.has(input.token)) return null
      consumed.add(input.token)
      return { userId }
    },
    findActiveMembershipAsync: async () => ({ role: "tenant_admin", tenantId }),
    findUserByIdAsync: async (id) => ({ id, tenantId }),
    resolveTenantAsync: async () => ({ tenant: { id: tenantId } }),
    ...overrides,
  }
  return { calls, deps }
}

function expectLoginRedirect(response: Response) {
  expect(response.status).toBe(303)
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
    "/login"
  )
  expect(new URL(response.headers.get("location") ?? "").search).toBe("")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.get("referrer-policy")).toBe("no-referrer")
}

describe("dashboard workspace session handoff", () => {
  test("a valid token sets both scoped cookies and opens setup mode", async () => {
    const { deps } = createDeps()
    const response = await handleWorkspaceSessionHandoffPost(
      handoffRequest(),
      deps
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.host).toBe(tenantHost)
    expect(`${location.pathname}${location.search}`).toBe(
      "/getting-started?step=setup-mode"
    )
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")

    const sessionCookie = response.cookies.get(
      `halaalvest_session_${tenantSlug}`
    )
    const userCookie = response.cookies.get(`halaalvest_user_${tenantSlug}`)
    expect(userCookie?.value).toBe(userId)
    for (const cookie of [sessionCookie, userCookie]) {
      expect(cookie).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true,
      })
      expect(cookie?.maxAge).toBeUndefined()
    }
    const session = await verifySignedSessionToken({
      expectedScope: tenantSlug,
      token: sessionCookie?.value,
    })
    expect(session).toMatchObject({ scope: tenantSlug, userId })
  })

  test("a reused token goes to /login", async () => {
    const { deps } = createDeps()
    await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
  })

  test("an expired or unknown token goes to /login", async () => {
    const { deps } = createDeps({
      consumeWorkspaceSessionHandoff: async () => null,
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
  })

  test("a token for a different tenant than the host goes to /login", async () => {
    const { calls, deps } = createDeps({
      resolveTenantAsync: async () => ({ tenant: { id: "tenant-other" } }),
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
    expect(calls).toEqual(["consume:tenant-other"])
  })

  test("a user from another tenant goes to /login", async () => {
    const { deps } = createDeps({
      findUserByIdAsync: async (id) => ({ id, tenantId: "tenant-other" }),
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
  })

  test("a non-admin membership goes to /login", async () => {
    const { deps } = createDeps({
      findActiveMembershipAsync: async () => ({
        role: "operations_officer",
        tenantId,
      }),
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
  })

  test("a missing membership goes to /login", async () => {
    const { deps } = createDeps({
      findActiveMembershipAsync: async () => null,
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
  })

  test("a deleted user goes to /login after the token is burned", async () => {
    const { calls, deps } = createDeps({
      findUserByIdAsync: async () => null,
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
    expect(calls).toEqual([`consume:${tenantId}`])
  })

  test("the platform scope is rejected before any lookup", async () => {
    const { calls, deps } = createDeps()
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(
        handoffRequest({ host: "localhost:3001" }),
        deps
      )
    )
    expect(calls).toEqual([])
  })

  test("a host with no tenant goes to /login", async () => {
    const { calls, deps } = createDeps({
      resolveTenantAsync: async () => ({ tenant: null }),
    })
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
    )
    expect(calls).toEqual([])
  })

  test("a missing token goes to /login without consuming", async () => {
    const { calls, deps } = createDeps()
    expectLoginRedirect(
      await handleWorkspaceSessionHandoffPost(
        handoffRequest({ token: null }),
        deps
      )
    )
    expect(calls).toEqual([])
  })

  test("a thrown error goes to /login without detail", async () => {
    const { deps } = createDeps({
      consumeWorkspaceSessionHandoff: async () => {
        throw new Error("database unavailable")
      },
    })
    const originalError = console.error
    console.error = () => {}
    try {
      expectLoginRedirect(
        await handleWorkspaceSessionHandoffPost(handoffRequest(), deps)
      )
    } finally {
      console.error = originalError
    }
  })

  test("GET is rejected with a redirect to /login", async () => {
    expectLoginRedirect(GET(handoffRequest({ method: "GET" })))
  })
})
