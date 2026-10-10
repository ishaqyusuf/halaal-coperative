import { describe, expect, test } from "bun:test"
import { assertMobileReleaseEnvironment } from "../../mobile-release-env"
import { resolveMobileServiceUrl } from "./mobile-service-url"

describe("resolveMobileServiceUrl", () => {
  test("keeps an explicit hosted URL and trims its trailing slash", () => {
    expect(
      resolveMobileServiceUrl({
        configuredUrl: "https://api.halaalvest.example/",
        debuggerHostname: "192.168.1.20",
        defaultPort: "1442",
        requiredUrlName: "EXPO_PUBLIC_API_URL",
      })
    ).toBe("https://api.halaalvest.example")
  })

  test("maps a configured local URL to the active Expo host", () => {
    expect(
      resolveMobileServiceUrl({
        configuredUrl: "http://localhost:1442/",
        debuggerHostname: "192.168.1.20",
        defaultPort: "1442",
        requiredUrlName: "EXPO_PUBLIC_API_URL",
      })
    ).toBe("http://192.168.1.20:1442")
  })

  test("uses the configured port when Expo supplies the host", () => {
    expect(
      resolveMobileServiceUrl({
        configuredPort: "2442",
        debuggerHostname: "10.0.2.2",
        defaultPort: "1442",
        requiredUrlName: "EXPO_PUBLIC_API_URL",
      })
    ).toBe("http://10.0.2.2:2442")
  })

  test("requires an explicit URL when there is no Expo host", () => {
    expect(() =>
      resolveMobileServiceUrl({
        debuggerHostname: null,
        defaultPort: "1442",
        requiredUrlName: "EXPO_PUBLIC_API_URL",
      })
    ).toThrow(
      "EXPO_PUBLIC_API_URL must be set when a local Expo host is unavailable."
    )
  })
})

describe("assertMobileReleaseEnvironment", () => {
  test("accepts non-local HTTPS service origins for production", () => {
    expect(() =>
      assertMobileReleaseEnvironment({
        apiUrl: "https://api.halaalvest.com",
        appVariant: "production",
        dashboardUrl: "https://app.halaalvest.com",
        legalOrigin: "https://halaalvest.com",
      })
    ).not.toThrow()
  })

  test("rejects a missing production API URL", () => {
    expect(() =>
      assertMobileReleaseEnvironment({
        appVariant: "production",
        dashboardUrl: "https://app.halaalvest.com",
      })
    ).toThrow("EXPO_PUBLIC_API_URL is required")
  })

  test("rejects local preview URLs", () => {
    expect(() =>
      assertMobileReleaseEnvironment({
        apiUrl: "http://localhost:1442",
        appVariant: "preview",
        dashboardUrl: "https://app.halaalvest.com",
      })
    ).toThrow("EXPO_PUBLIC_API_URL must use a non-local HTTPS origin")
  })

  test("allows an omitted Preview legal origin but rejects a malformed configured one", () => {
    const preview = {
      apiUrl: "https://qa-api.halaalvest.com",
      appVariant: "preview",
      dashboardUrl: "https://qa-app.halaalvest.com",
      easBuildProfile: "preview",
    }
    expect(() => assertMobileReleaseEnvironment(preview)).not.toThrow()
    expect(() =>
      assertMobileReleaseEnvironment({
        ...preview,
        legalOrigin: "https://legal.validation.invalid",
      })
    ).toThrow("EXPO_PUBLIC_LEGAL_ORIGIN must be a public HTTPS origin")
    expect(() =>
      assertMobileReleaseEnvironment({
        ...preview,
        legalOrigin: "https://preview.halaalvest.com/terms",
      })
    ).toThrow("EXPO_PUBLIC_LEGAL_ORIGIN must be a public HTTPS origin")
    expect(() =>
      assertMobileReleaseEnvironment({
        ...preview,
        legalOrigin: "https://preview.halaalvest.com",
      })
    ).not.toThrow()
  })

  test("does not require hosted URLs for a development-classified build", () => {
    expect(() =>
      assertMobileReleaseEnvironment({ appVariant: "development" })
    ).not.toThrow()
  })

  test("rejects local aliases, literal IPs, URL secrets and conflicting variants", () => {
    for (const apiUrl of [
      "https://api.localhost",
      "https://192.168.1.10",
      "https://[::1]",
      "https://user:secret@api.halaalvest.com",
      "https://api.halaalvest.com?token=secret",
    ]) {
      expect(() =>
        assertMobileReleaseEnvironment({
          apiUrl,
          appVariant: "production",
          dashboardUrl: "https://app.halaalvest.com",
        })
      ).toThrow()
    }
    expect(() =>
      assertMobileReleaseEnvironment({
        appVariant: "development",
        easBuildProfile: "production",
      })
    ).toThrow("APP_VARIANT must match")
  })

  test("store builds require a public legal-page origin", () => {
    const base = {
      apiUrl: "https://qa-api.halaalvest.com",
      appVariant: "production",
      dashboardUrl: "https://qa-app.halaalvest.com",
      easBuildProfile: "store-qa",
    }
    expect(() => assertMobileReleaseEnvironment(base)).toThrow(
      "EXPO_PUBLIC_LEGAL_ORIGIN is required"
    )
    for (const legalOrigin of [
      "http://halaalvest.com",
      "https://legal.localhost",
      "https://legal.validation.invalid",
      "https://legal.validation.example",
      "https://example.com",
      "https://docs.example.org",
      "https://halaalvest.com/terms",
      "https://halaalvest.com?draft=true",
    ]) {
      expect(() =>
        assertMobileReleaseEnvironment({ ...base, legalOrigin })
      ).toThrow()
    }
    expect(() =>
      assertMobileReleaseEnvironment({
        ...base,
        legalOrigin: "https://halaalvest.com",
      })
    ).not.toThrow()
    expect(() =>
      assertMobileReleaseEnvironment({
        ...base,
        easBuildProfile: "production",
      })
    ).toThrow("EXPO_PUBLIC_LEGAL_ORIGIN is required")
    expect(() =>
      assertMobileReleaseEnvironment({
        apiUrl: base.apiUrl,
        appVariant: "production",
        dashboardUrl: base.dashboardUrl,
      })
    ).toThrow("EXPO_PUBLIC_LEGAL_ORIGIN is required")
  })

  test("store QA rejects known production service hosts", () => {
    const base = {
      apiUrl: "https://qa-api.halaalvest.com",
      appVariant: "production",
      dashboardUrl: "https://qa-app.halaalvest.com",
      easBuildProfile: "store-qa",
      legalOrigin: "https://halaalvest.com",
    }
    expect(() => assertMobileReleaseEnvironment(base)).not.toThrow()
    for (const [name, urls] of [
      [
        "EXPO_PUBLIC_API_URL",
        ["https://app.halaalvest.com", "https://api.halaalvest.com/v1"],
      ],
      [
        "EXPO_PUBLIC_DASHBOARD_URL",
        ["https://app.halaalvest.com", "https://api.halaalvest.com"],
      ],
    ] as const) {
      for (const url of urls) {
        expect(() =>
          assertMobileReleaseEnvironment({
            ...base,
            ...(name === "EXPO_PUBLIC_API_URL"
              ? { apiUrl: url }
              : { dashboardUrl: url }),
          })
        ).toThrow(
          `${name} must not use a production service host for store-qa builds.`
        )
      }
    }
    expect(() =>
      assertMobileReleaseEnvironment({
        ...base,
        apiUrl: "https://api.halaalvest.com",
        dashboardUrl: "https://app.halaalvest.com",
        easBuildProfile: "production",
      })
    ).not.toThrow()
  })

  test("Preview cloud config rejects Production service hosts", () => {
    for (const apiUrl of [
      "https://app.halaalvest.com",
      "https://api.halaalvest.com",
    ]) {
      expect(() =>
        assertMobileReleaseEnvironment({
          appVariant: "preview",
          easBuildProfile: "preview",
          apiUrl,
          dashboardUrl: "https://qa.halaalvest.com",
          legalOrigin: "https://halaalvest.com",
        })
      ).toThrow("production service host for preview")
    }
  })

  test("blocks placeholder API and dashboard hosts in release builds", () => {
    for (const easBuildProfile of ["store-qa", "production"]) {
      for (const placeholder of [
        "https://api.validation.invalid",
        "https://api.halaalvest.test",
        "https://api.halaalvest.example",
        "https://api.example.com",
      ]) {
        expect(() =>
          assertMobileReleaseEnvironment({
            apiUrl: placeholder,
            appVariant: "production",
            dashboardUrl: "https://app.halaalvest.com",
            easBuildProfile,
            legalOrigin: "https://halaalvest.com",
          })
        ).toThrow(
          "EXPO_PUBLIC_API_URL must not use a reserved placeholder domain"
        )
        expect(() =>
          assertMobileReleaseEnvironment({
            apiUrl: "https://api.halaalvest.com",
            appVariant: "production",
            dashboardUrl: placeholder,
            easBuildProfile,
            legalOrigin: "https://halaalvest.com",
          })
        ).toThrow(
          "EXPO_PUBLIC_DASHBOARD_URL must not use a reserved placeholder domain"
        )
      }
    }
  })

  test("keeps unreachable endpoints available to the native-validation profile", () => {
    expect(() =>
      assertMobileReleaseEnvironment({
        apiUrl: "https://api.validation.invalid",
        appVariant: "production",
        dashboardUrl: "https://dashboard.validation.invalid",
        easBuildProfile: "native-validation",
      })
    ).not.toThrow()
    expect(() =>
      assertMobileReleaseEnvironment({
        apiUrl: "https://api.validation.invalid",
        appVariant: "preview",
        dashboardUrl: "https://dashboard.validation.invalid",
        easBuildProfile: "native-validation",
      })
    ).toThrow("APP_VARIANT must be production")
  })
})
