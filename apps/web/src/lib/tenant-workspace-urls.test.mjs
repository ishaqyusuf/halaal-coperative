import { afterEach, describe, expect, test } from "bun:test"
import { buildOnboardingWorkspaceUrls } from "./tenant-workspace-urls.ts"

const trackedEnvKeys = [
  "APP_ROOT_DOMAIN",
  "DASHBOARD_APP_URL",
  "HALAAL_VEST_DASHBOARD_APP_PORT",
  "HALAAL_VEST_DASHBOARD_ROOT_DOMAIN",
  "HALAAL_VEST_PLATFORM_ROOT_DOMAIN",
  "HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN",
  "NEXT_PUBLIC_DASHBOARD_APP_URL",
]

const originalEnv = Object.fromEntries(
  trackedEnvKeys.map((key) => [key, process.env[key]]),
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
  test("uses the tenant URL library with the configured local dashboard root", () => {
    setEnv({
      DASHBOARD_APP_URL: "http://app.halaalvest.localhost:1441",
      HALAAL_VEST_DASHBOARD_ROOT_DOMAIN: "app.halaalvest.localhost",
      HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN: "app.halaalvest.localhost",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "http://localhost:1440/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe(
      "http://mig-test-123.app.halaalvest.localhost:1441",
    )
    expect(urls.siteUrl).toBe(
      "http://mig-test-123.app.halaalvest.localhost:1441",
    )
  })

  test("falls back to the dashboard port for bare localhost onboarding requests", () => {
    setEnv({
      HALAAL_VEST_DASHBOARD_APP_PORT: "1441",
      HALAAL_VEST_DASHBOARD_ROOT_DOMAIN: "app.halaalvest.localhost",
      HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN: "app.halaalvest.localhost",
    })

    const urls = buildOnboardingWorkspaceUrls({
      currentOrigin: "http://localhost:1440/api/onboarding",
      tenantSlug: "mig-test-123",
    })

    expect(urls.dashboardUrl).toBe("http://mig-test-123.localhost:1441")
    expect(urls.siteUrl).toBe("http://mig-test-123.localhost:1441")
  })
})
