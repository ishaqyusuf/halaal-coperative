import { describe, expect, test } from "bun:test"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"

const tenantSlug = "kaduna-reliable-health-workers-society-723"
const localTenantHost = `${tenantSlug}.halaalvest-dash.localhost`

function createTenantDashboardRequest(
  host: string,
  {
    pathname = "/login",
    headers = {},
  }: { pathname?: string; headers?: Record<string, string> } = {}
) {
  return new NextRequest(`https://${host}${pathname}`, {
    headers: {
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
      ...headers,
    },
  })
}

async function withNodeEnv<T>(nodeEnv: string, callback: () => Promise<T>) {
  const previousNodeEnv = process.env.NODE_ENV

  Object.assign(process.env, { NODE_ENV: nodeEnv })

  try {
    return await callback()
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV")
    } else {
      Object.assign(process.env, { NODE_ENV: previousNodeEnv })
    }
  }
}

function getForwardedRequestHeaderNames(response: Response) {
  return (response.headers.get("x-middleware-override-headers") ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
}

describe("dashboard proxy tenant hosts", () => {
  test("serves local tenant dashboards through the HTTPS Portless host", async () => {
    const response = await proxy(createTenantDashboardRequest(localTenantHost))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(
      response.headers.get("x-middleware-request-x-tenant-subdomain")
    ).toBe(tenantSlug)
  })

  test("keeps local Portless hosts on HTTPS in production-mode processes", async () => {
    await withNodeEnv("production", async () => {
      const response = await proxy(
        createTenantDashboardRequest(localTenantHost)
      )

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })
  })

  test("redirects production dashboard aliases to the canonical tenant host", async () => {
    await withNodeEnv("production", async () => {
      const response = await proxy(
        createTenantDashboardRequest(`dashboard.${tenantSlug}.halaalvest.com`)
      )

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe(
        `https://${tenantSlug}.halaalvest.com/login`
      )
    })
  })
})

describe("dashboard proxy request headers", () => {
  test.each(["x-user-id", "x-session-token", "x-user-role"])(
    "strips a client-supplied %s header",
    async (headerName) => {
      const response = await proxy(
        createTenantDashboardRequest(localTenantHost, {
          headers: { [headerName]: "super_admin" },
        })
      )

      expect(response.status).toBe(200)
      expect(getForwardedRequestHeaderNames(response)).not.toContain(headerName)
      expect(
        response.headers.get(`x-middleware-request-${headerName}`)
      ).toBeNull()
    }
  )

  test("replaces spoofed tenant headers with host-derived values", async () => {
    const response = await proxy(
      createTenantDashboardRequest(localTenantHost, {
        headers: {
          "x-tenant-hostname": "attacker.example.com",
          "x-tenant-subdomain": "attacker",
        },
      })
    )

    expect(
      response.headers.get("x-middleware-request-x-tenant-subdomain")
    ).toBe(tenantSlug)
    expect(response.headers.get("x-middleware-request-x-tenant-hostname")).toBe(
      localTenantHost
    )
  })
})

describe("dashboard proxy route guard", () => {
  test("redirects protected routes without a session cookie to login", async () => {
    const response = await proxy(
      createTenantDashboardRequest(localTenantHost, { pathname: "/members" })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      `https://${localTenantHost}/login?next=%2Fmembers`
    )
  })

  test("keeps the deep link's query in next so sign-in returns to it", async () => {
    const response = await proxy(
      createTenantDashboardRequest(localTenantHost, {
        pathname: "/loans?loanSheetType=request",
      })
    )

    expect(response.headers.get("location")).toBe(
      `https://${localTenantHost}/login?next=%2Floans%3FloanSheetType%3Drequest`
    )
  })

  test("lets protected routes through with the tenant-scoped session cookie", async () => {
    const response = await proxy(
      createTenantDashboardRequest(localTenantHost, {
        pathname: "/notifications",
        headers: { cookie: `halaalvest_session_${tenantSlug}=token` },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })
})
