import { describe, expect, test } from "bun:test"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"

const tenantSlug = "kaduna-reliable-health-workers-society-723"

function createTenantDashboardRequest(host: string) {
  return new NextRequest(`https://${host}/login`, {
    headers: {
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
    },
  })
}

function withNodeEnv<T>(nodeEnv: string, callback: () => T) {
  const previousNodeEnv = process.env.NODE_ENV

  Object.assign(process.env, { NODE_ENV: nodeEnv })

  try {
    return callback()
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV")
    } else {
      Object.assign(process.env, { NODE_ENV: previousNodeEnv })
    }
  }
}

describe("dashboard proxy tenant hosts", () => {
  test("serves local tenant dashboards through the HTTPS Portless host", () => {
    const response = proxy(
      createTenantDashboardRequest(`${tenantSlug}.halaalvest-dash.localhost`)
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(
      response.headers.get("x-middleware-request-x-tenant-subdomain")
    ).toBe(tenantSlug)
  })

  test("keeps local Portless hosts on HTTPS in production-mode processes", () => {
    withNodeEnv("production", () => {
      const response = proxy(
        createTenantDashboardRequest(`${tenantSlug}.halaalvest-dash.localhost`)
      )

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })
  })

  test("redirects production dashboard aliases to the canonical tenant host", () => {
    withNodeEnv("production", () => {
      const response = proxy(
        createTenantDashboardRequest(`dashboard.${tenantSlug}.halaalvest.com`)
      )

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe(
        `https://${tenantSlug}.halaalvest.com/login`
      )
    })
  })
})
