import { describe, expect, test } from "bun:test"
import {
  buildTenantUrlVariants,
  resolveTenantUrlContext,
  type TenantUrlConfig,
} from "."

const config: TenantUrlConfig = {
  appRootDomain: "halaalvest-dash.localhost",
  additionalRootDomains: ["halaalvest.localhost"],
  urlVariantPathHosts: ["localhost:1441", "127.0.0.1:1441"],
  pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
  enablePathStyleHosts: true,
  projectSlug: "halaalvest",
}

describe("tenant URL variants", () => {
  test("resolves tenant slugs from additional local root domains", () => {
    const context = resolveTenantUrlContext(
      {
        host: "minna-trust.halaalvest.localhost",
        pathname: "/getting-started",
        protocol: "http",
      },
      config
    )

    expect(context.tenantSlug).toBe("minna-trust")
    expect(context.productPath).toBe("/getting-started")
    expect(context.style).toBe("subdomain")
  })

  test("builds reusable current-page dashboard URL variants", () => {
    const context = resolveTenantUrlContext(
      {
        host: "localhost:1441",
        pathname: "/minna-trust/getting-started",
        protocol: "http",
      },
      config
    )

    const variants = buildTenantUrlVariants({
      config,
      context,
      currentUrl:
        "http://localhost:1441/minna-trust/getting-started?step=setup",
    })

    expect(variants.map((variant) => variant.url)).toEqual([
      "http://minna-trust.halaalvest-dash.localhost/getting-started?step=setup",
      "http://minna-trust.halaalvest.localhost/getting-started?step=setup",
      "http://localhost:1441/minna-trust/getting-started?step=setup",
      "http://127.0.0.1:1441/minna-trust/getting-started?step=setup",
    ])
    expect(variants[2]?.isCurrent).toBe(true)
  })
})
