import { describe, expect, test } from "bun:test"
import {
  buildTenantDashboardUrl,
  extractDashboardTenantSlug,
  localDashboardRootDomain,
  resolveDashboardSessionScope,
} from "./tenant-domains"

describe("tenant dashboard domains", () => {
  test("builds local dashboard URLs on the dashboard root domain", () => {
    const url = buildTenantDashboardUrl("minna-trust", {
      currentOrigin: "http://halaalvest.localhost",
      pathname: "/",
    })

    expect(url).toBe(`http://minna-trust.${localDashboardRootDomain}`)
  })

  test("extracts tenant slug and session scope from local dashboard host", () => {
    const host = `minna-trust.${localDashboardRootDomain}`

    expect(extractDashboardTenantSlug(host)).toBe("minna-trust")
    expect(resolveDashboardSessionScope(host)).toBe("minna-trust")
  })
})
