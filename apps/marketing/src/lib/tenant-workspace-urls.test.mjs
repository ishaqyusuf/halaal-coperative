/* global process */

import { afterEach, describe, expect, test } from "bun:test"
import { buildOnboardingWorkspaceUrls } from "./tenant-workspace-urls.ts"

const trackedEnvKeys = [
  "APP_ROOT_DOMAIN",
  "DASHBOARD_APP_URL",
  "DASHBOARD_APP_PORT",
  "DASHBOARD_ROOT_DOMAIN",
  "LOCAL_ROOT_DOMAIN",
  "NEXT_PUBLIC_DASHBOARD_APP_URL",
  "NODE_ENV",
  "PLATFORM_ROOT_DOMAIN",
  "TENANT_SITE_APP_URL",
  "TENANT_ROOT_DOMAIN",
]

const originalEnv = Object.fromEntries(
  trackedEnvKeys.map((key) => [key, process.env[key]])
)

function setEnv(values) {
  for (const key of trackedEnvKeys) {
    const value = values[key]

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

afterEach(() => {
  for (const key of trackedEnvKeys) {
    const value = originalEnv[key]

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe("buildOnboardingWorkspaceUrls", () => {
  test("separates local tenant site and dashboard roots by default", () => {
    setEnv({
      TENANT_SITE_APP_URL: "https://halaalvest.localhost",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "https://halaalvest.localhost/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe(
      "https://mig-test-123.halaalvest-dash.localhost"
    )
    expect(urls.siteUrl).toBe("https://mig-test-123.halaalvest.localhost")
    expect(urls.devDashboardUrlVariants.map((variant) => variant.url)).toEqual([
      "https://mig-test-123.halaalvest-dash.localhost",
      "http://mig-test-123.localhost:1441",
      "http://localhost:1441/mig-test-123",
    ])
  })

  test("keeps configured direct ports out of primary workspace URLs", () => {
    setEnv({
      DASHBOARD_APP_URL: "http://app.halaalvest.localhost:1441",
      DASHBOARD_ROOT_DOMAIN: "app.halaalvest.localhost",
      LOCAL_ROOT_DOMAIN: "app.halaalvest.localhost",
      TENANT_SITE_APP_URL: "http://app.halaalvest.localhost:1440",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "http://localhost:1440/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe(
      "https://mig-test-123.app.halaalvest.localhost"
    )
    expect(urls.siteUrl).toBe("https://mig-test-123.app.halaalvest.localhost")
    expect(urls.devDashboardUrlVariants.map((variant) => variant.url)).toEqual([
      "https://mig-test-123.app.halaalvest.localhost",
      "http://mig-test-123.localhost:1441",
      "http://localhost:1441/mig-test-123",
    ])
  })

  test("uses the HTTPS Portless root for bare localhost onboarding requests", () => {
    setEnv({
      DASHBOARD_APP_PORT: "1441",
      DASHBOARD_ROOT_DOMAIN: "app.halaalvest.localhost",
      LOCAL_ROOT_DOMAIN: "app.halaalvest.localhost",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "http://localhost:1440/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe(
      "https://mig-test-123.app.halaalvest.localhost"
    )
    expect(urls.siteUrl).toBe("https://mig-test-123.app.halaalvest.localhost")
    expect(urls.devDashboardUrlVariants.map((variant) => variant.url)).toEqual([
      "https://mig-test-123.app.halaalvest.localhost",
      "http://mig-test-123.localhost:1441",
      "http://localhost:1441/mig-test-123",
    ])
  })

  test("offers portless and direct local dashboard variants", () => {
    setEnv({
      DASHBOARD_APP_URL: "https://app.halaalvest.localhost",
      DASHBOARD_ROOT_DOMAIN: "halaalvest.localhost",
      LOCAL_ROOT_DOMAIN: "halaalvest.localhost",
      TENANT_SITE_APP_URL: "https://halaalvest.localhost",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "https://halaalvest.localhost/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe("https://mig-test-123.halaalvest.localhost")
    expect(urls.devDashboardUrlVariants.map((variant) => variant.url)).toEqual([
      "https://mig-test-123.halaalvest.localhost",
      "http://mig-test-123.localhost:1441",
      "http://localhost:1441/mig-test-123",
    ])
  })

  test("builds production onboarding dashboard URLs at the tenant root", () => {
    setEnv({
      PLATFORM_ROOT_DOMAIN: "halaalvest.com",
      NODE_ENV: "production",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "https://halaalvest.com/api/onboarding",
      tenantSlug: "test-4",
    })

    expect(urls.dashboardUrl).toBe("https://test-4.halaalvest.com")
    expect(urls.siteUrl).toBe("https://test-4.halaalvest.com")
    expect(urls.devDashboardUrlVariants).toEqual([])
  })
})
