import { afterAll, describe, expect, mock, test } from "bun:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")

type BuildVariant = "development" | "preview" | "production"

const releaseEnv: Record<BuildVariant, Record<string, string | undefined>> = {
  development: {
    APP_VARIANT: "development",
    NODE_ENV: "development",
  },
  preview: {
    APP_VARIANT: "preview",
    EXPO_PUBLIC_API_URL: "https://preview-api.halaalvest-staging.com",
    EXPO_PUBLIC_DASHBOARD_URL: "https://preview-app.halaalvest-staging.com",
    NODE_ENV: "production",
  },
  production: {
    APP_VARIANT: "production",
    EXPO_PUBLIC_API_URL: "https://api.halaalvest.com",
    EXPO_PUBLIC_DASHBOARD_URL: "https://app.halaalvest.com",
    EXPO_PUBLIC_LEGAL_ORIGIN: "https://halaalvest.com",
    NODE_ENV: "production",
  },
}

const managedKeys = [
  "APP_VARIANT",
  "EAS_BUILD_PROFILE",
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_APP_VARIANT",
  "EXPO_PUBLIC_DASHBOARD_URL",
  "EXPO_PUBLIC_LEGAL_ORIGIN",
  "NODE_ENV",
]
const originalEnv = Object.fromEntries(
  managedKeys.map((key) => [key, process.env[key]])
)

function applyEnv(values: Record<string, string | undefined>) {
  for (const key of managedKeys) {
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

// A forged development token must never unlock fixtures or Quick Fill.
const storedToken = "mock-member-session"
mock.module("expo-secure-store", () => ({
  deleteItemAsync: async () => {},
  getItem: () => storedToken,
  getItemAsync: async () => storedToken,
  setItem: () => {},
  setItemAsync: async () => {},
}))
mock.module("expo-crypto", () => ({ randomUUID: () => "test-uuid" }))

/** Loads the real app config and build flags as one variant's bundle sees them. */
async function loadBuild(variant: BuildVariant) {
  applyEnv(releaseEnv[variant])
  const config = (await import(`../../app.config.ts?variant=${variant}`))
    .default as { extra: { appVariant: string; qaAcceleratorClient: boolean } }
  mock.module("expo-constants", () => ({
    default: { expoConfig: { extra: config.extra } },
  }))
  const session = (await import(
    `./mobile-dev-session.ts?variant=${variant}`
  )) as typeof import("./mobile-dev-session")
  return {
    appVariant: config.extra.appVariant,
    devFixtureSession: session.isMobileDevFixtureSession(),
    developmentBuild: session.isMobileDevelopmentBuild,
    qaAcceleratorClient: config.extra.qaAcceleratorClient,
    qaClientBuild: session.isMobileQaClientBuild,
  }
}

afterAll(() => applyEnv(originalEnv))

describe("mobile Quick Fill production absence", () => {
  test("a production build exposes no QA client or fixture session", async () => {
    expect(await loadBuild("production")).toEqual({
      appVariant: "production",
      devFixtureSession: false,
      developmentBuild: false,
      qaAcceleratorClient: false,
      qaClientBuild: false,
    })
  })

  test("preview builds keep QA tooling without development fixtures", async () => {
    expect(await loadBuild("preview")).toEqual({
      appVariant: "preview",
      devFixtureSession: false,
      developmentBuild: false,
      qaAcceleratorClient: true,
      qaClientBuild: true,
    })
  })

  test("development builds enable QA tooling and fixture sessions", async () => {
    expect(await loadBuild("development")).toEqual({
      appVariant: "development",
      devFixtureSession: true,
      developmentBuild: true,
      qaAcceleratorClient: true,
      qaClientBuild: true,
    })
  })

  test("the Quick Fill control renders nothing outside QA client builds", () => {
    const source = readFileSync(
      join(mobileRoot, "src/components/app/dev-quick-fill.tsx"),
      "utf8"
    )
    expect(source).toMatch(/if \(\s*!isMobileQaClientBuild \|\|/)
    expect(source).toMatch(/isKeyboardVisible\s*\)?\s*return null/)
  })
})
