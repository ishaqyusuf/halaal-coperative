import { describe, expect, test } from "bun:test"
import { MOBILE_STORE_APP_VERSION } from "../apps/mobile/release-version"
import {
  inspectAndroidAppConfig,
  inspectBundleOrigins,
} from "./mobile-artifact-origins"

const expected = {
  api: "https://api.halaalvest.com",
  dashboard: "https://app.halaalvest.com",
  legal: "https://halaalvest.com",
}

describe("Android artifact origin inventory", () => {
  test("requires the three exact release origins", () => {
    const bytes = Buffer.from(
      "https://api.halaalvest.com/v1\0https://app.halaalvest.com\0https://halaalvest.com/privacy"
    )
    expect(inspectBundleOrigins(bytes, expected)).toMatchObject({
      ready: true,
      missing: [],
      reserved: [],
    })
    expect(
      inspectBundleOrigins(Buffer.from("https://api.halaalvest.com"), expected)
        .missing
    ).toEqual([expected.dashboard, expected.legal])
  })

  test("rejects reserved hosts even when release origins are also present", () => {
    const bytes = Buffer.from(
      `${expected.api} ${expected.dashboard} ${expected.legal} https://api.validation.invalid`
    )
    expect(inspectBundleOrigins(bytes, expected)).toMatchObject({
      ready: false,
      reserved: ["https://api.validation.invalid"],
    })
  })

  test("rejects placeholder expected origins", () => {
    expect(() =>
      inspectBundleOrigins(Buffer.from("https://api.validation.invalid"), {
        ...expected,
        api: "https://api.validation.invalid",
      })
    ).toThrow("Expected release URLs must be public HTTPS origins")
  })
})

describe("Android artifact app identity", () => {
  const config = {
    name: "HalaalVest",
    version: MOBILE_STORE_APP_VERSION,
    runtimeVersion: { policy: "fingerprint" },
    android: { package: "com.halaalvest.mobile" },
    extra: {
      appVariant: "production",
      eas: { projectId: "3fb3e5e2-bd84-4308-8739-e9f4436d0da9" },
    },
    updates: {
      url: "https://u.expo.dev/3fb3e5e2-bd84-4308-8739-e9f4436d0da9",
    },
  }

  test("accepts the reviewed release identity", () => {
    expect(inspectAndroidAppConfig(config)).toEqual({
      matches: true,
      mismatches: [],
    })
  })

  test("flags old branding and mismatched app targets", () => {
    expect(
      inspectAndroidAppConfig({
        ...config,
        name: "Halaalvest",
        android: { package: "com.halaalvest.mobile.preview" },
      }).mismatches
    ).toEqual(["app-name", "package"])
  })

  test("rejects a stale app version or OTA runtime", () => {
    expect(
      inspectAndroidAppConfig({
        ...config,
        version: "0.2.0",
        runtimeVersion: "0.2.0",
      }).mismatches
    ).toEqual(["app-version", "update-runtime"])
  })
})
