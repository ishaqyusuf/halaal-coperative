import { describe, expect, test } from "bun:test"
import { getPublicRequestHost } from "./request-host"

describe("getPublicRequestHost", () => {
  test("prefers the public forwarded host over the platform host", () => {
    const headers = new Headers({
      host: "dashboard-production.vercel.app",
      "x-forwarded-host": "test-4.halaalvest.com",
    })

    expect(getPublicRequestHost(headers)).toBe("test-4.halaalvest.com")
  })

  test("uses the first forwarded host when proxies append values", () => {
    const headers = new Headers({
      host: "dashboard-production.vercel.app",
      "x-forwarded-host": "test-4.halaalvest.com, proxy.internal",
    })

    expect(getPublicRequestHost(headers)).toBe("test-4.halaalvest.com")
  })

  test("falls back to host when there is no forwarded host", () => {
    const headers = new Headers({
      host: "test-4.halaalvest.com",
    })

    expect(getPublicRequestHost(headers)).toBe("test-4.halaalvest.com")
  })
})
