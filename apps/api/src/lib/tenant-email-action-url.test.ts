import { afterEach, describe, expect, test } from "bun:test"
import { resolveTenantEmailActionUrl } from "./server-notifications"

const configured = process.env.DASHBOARD_APP_URL

afterEach(() => {
  if (configured === undefined) delete process.env.DASHBOARD_APP_URL
  else process.env.DASHBOARD_APP_URL = configured
})

describe("resolveTenantEmailActionUrl", () => {
  test("a dashboard path keeps the caller's https scheme", () => {
    delete process.env.DASHBOARD_APP_URL
    expect(
      resolveTenantEmailActionUrl({
        actionUrl: "/domains",
        currentOrigin: "https://halaalvest-dash.localhost",
        tenantSlug: "coop",
      })
    ).toBe("https://coop.halaalvest-dash.localhost/domains")
  })

  test("without a request, DASHBOARD_APP_URL sets the scheme", () => {
    process.env.DASHBOARD_APP_URL = "https://halaalvest-dash.localhost"
    expect(
      resolveTenantEmailActionUrl({ actionUrl: "/members", tenantSlug: "coop" })
    ).toBe("https://coop.halaalvest-dash.localhost/members")
  })

  test("full links pass through", () => {
    expect(
      resolveTenantEmailActionUrl({
        actionUrl: "halaalvest://recovery?x=1",
        tenantSlug: "coop",
      })
    ).toBe("halaalvest://recovery?x=1")
  })
})
