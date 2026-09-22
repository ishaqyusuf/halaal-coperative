import { afterEach, expect, test } from "bun:test"
import { createEventsRoute } from "./route"

const POST = createEventsRoute("dashboard")
const originalFetch = globalThis.fetch
const oldVercel = process.env.VERCEL
const oldCollector = process.env.LOGLY_COLLECTOR_URL
const oldKey = process.env.LOGLY_DASHBOARD_PROJECT_KEY
const oldProject = process.env.NEXT_PUBLIC_LOGLY_PROJECT_DASHBOARD
const oldMobileKey = process.env.LOGLY_MOBILE_PROJECT_KEY
const oldMobileProject = process.env.LOGLY_MOBILE_PROJECT
const oldOrigins = process.env.LOGLY_DASHBOARD_ALLOWED_ORIGINS
const oldMobileOrigin = process.env.LOGLY_MOBILE_ORIGIN
const oldDomain = process.env.PLATFORM_ROOT_DOMAIN

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries({
    VERCEL: oldVercel,
    LOGLY_DASHBOARD_ALLOWED_ORIGINS: oldOrigins,
    LOGLY_MOBILE_ORIGIN: oldMobileOrigin,
    LOGLY_MOBILE_PROJECT_KEY: oldMobileKey,
    LOGLY_MOBILE_PROJECT: oldMobileProject,
    LOGLY_COLLECTOR_URL: oldCollector,
    LOGLY_DASHBOARD_PROJECT_KEY: oldKey,
    NEXT_PUBLIC_LOGLY_PROJECT_DASHBOARD: oldProject,
    PLATFORM_ROOT_DOMAIN: oldDomain,
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
function configure() {
  process.env.LOGLY_COLLECTOR_URL = "https://collector.example"
  process.env.LOGLY_DASHBOARD_PROJECT_KEY = "test-only-key"
  process.env.NEXT_PUBLIC_LOGLY_PROJECT_DASHBOARD = "halaalvest-dashboard"
  process.env.PLATFORM_ROOT_DOMAIN = "halaalvest.com"
  process.env.LOGLY_DASHBOARD_ALLOWED_ORIGINS = "https://tenant.halaalvest.com"
  process.env.LOGLY_MOBILE_ORIGIN = "https://halaalvest.com"
}
function request(origin = "https://tenant.halaalvest.com") {
  return new Request("https://tenant.halaalvest.com/api/analytics", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({
      sentAt: new Date().toISOString(),
      sdk: { name: "@ishaqyusuf/logly-core", version: "0.2.0" },
      events: [
        {
          eventId: crypto.randomUUID(),
          project: "different-project",
          name: "page_view",
          version: 1,
          source: "browser",
          occurredAt: new Date().toISOString(),
          route: "/members/private-id",
          properties: { email: "private@example.com" },
        },
      ],
    }),
  })
}
test("fails closed when no collector credential is configured", async () => {
  process.env.LOGLY_DASHBOARD_PROJECT_KEY = ""
  expect((await POST(request())).status).toBe(503)
})
test("rejects a foreign browser origin before forwarding", async () => {
  configure()
  expect((await POST(request("https://evil.example"))).status).toBe(403)
})
test("forwards only safe project-scoped events and propagates failures", async () => {
  configure()
  globalThis.fetch = (async (url, init) => {
    expect(String(url)).toBe("https://collector.example/v1/events")
    const body = JSON.parse(String(init?.body))
    expect(body.events[0]).toMatchObject({
      project: "halaalvest-dashboard",
      route: "/members",
      properties: {},
    })
    expect(new Headers(init?.headers).get("x-logly-origin")).toBe(
      "https://tenant.halaalvest.com"
    )
    return new Response("{}", { status: 429 })
  }) as typeof fetch
  expect((await POST(request())).status).toBe(429)
})

test("mobile proxy fixes project and key independently from web", async () => {
  configure()
  process.env.LOGLY_MOBILE_PROJECT_KEY = "mobile-test-key"
  process.env.LOGLY_MOBILE_PROJECT = "halaalvest-mobile"
  const mobile = createEventsRoute("mobile")
  expect((await mobile(request())).status).toBe(403)
  const nativeRequest = await nativeRequestForTest()
  nativeRequest.headers.delete("origin")
  globalThis.fetch = (async (_url, init) => {
    expect(new Headers(init?.headers).get("x-logly-project-key")).toBe(
      "mobile-test-key"
    )
    const batch = JSON.parse(String(init?.body))
    expect(batch.events[0].project).toBe("halaalvest-mobile")
    return Response.json({ accepted: 1 }, { status: 202 })
  }) as typeof fetch
  expect((await mobile(nativeRequest)).status).toBe(202)
})

test("forwards only product-edge country metadata on Vercel", async () => {
  configure()
  for (const [vercel, country, expected] of [
    ["1", "NG", "NG"],
    ["0", "NG", null],
    ["1", "invalid", null],
    ["1", "", null],
  ] as const) {
    process.env.VERCEL = vercel
    const input = request()
    input.headers.set("x-vercel-ip-country", country)
    input.headers.set("x-logly-country", "US")
    input.headers.set("x-forwarded-for", "192.0.2.1")
    globalThis.fetch = (async (_url, init) => {
      const headers = new Headers(init?.headers)
      expect(headers.get("x-logly-country")).toBe(expected)
      expect(headers.get("x-forwarded-for")).toBeNull()
      return Response.json({ accepted: 1 }, { status: 202 })
    }) as typeof fetch
    expect((await POST(input)).status).toBe(202)
  }
})

test("native country forwarding preserves its separate project credential", async () => {
  configure()
  process.env.VERCEL = "1"
  process.env.LOGLY_MOBILE_PROJECT_KEY = "mobile-country-test-key"
  process.env.LOGLY_MOBILE_PROJECT = "halaalvest-mobile"
  const input = await nativeRequestForTest()
  input.headers.delete("origin")
  input.headers.set("x-vercel-ip-country", "GB")
  globalThis.fetch = (async (_url, init) => {
    const headers = new Headers(init?.headers)
    expect(headers.get("x-logly-country")).toBe("GB")
    expect(headers.get("x-logly-project-key")).toBe("mobile-country-test-key")
    expect(JSON.parse(String(init?.body)).events[0].project).toBe(
      "halaalvest-mobile"
    )
    return Response.json({ accepted: 1 }, { status: 202 })
  }) as typeof fetch
  expect((await createEventsRoute("mobile")(input)).status).toBe(202)
})

async function nativeRequestForTest() {
  const input = request()
  const body = await input.json()
  Object.assign(body.events[0], {
    name: "screen_view",
    source: "mobile",
    platform: "android",
    appVersion: "0.1.0",
    appBuild: "9",
  })
  return new Request(input.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("rejects cross-surface origins and ignores shared root credentials", async () => {
  configure()
  expect((await POST(request("https://halaalvest.com"))).status).toBe(403)
  delete process.env.LOGLY_DASHBOARD_PROJECT_KEY
  process.env.LOGLY_PROJECT_KEY = "legacy-shared-key"
  try {
    expect((await POST(request())).status).toBe(503)
  } finally {
    delete process.env.LOGLY_PROJECT_KEY
  }
})
test("Android native contract survives projection; browser/iOS input is rejected", async () => {
  configure()
  process.env.LOGLY_MOBILE_PROJECT_KEY = "test-mobile"
  const mobile = createEventsRoute("mobile")
  globalThis.fetch = (async (_url, init) => {
    const event = JSON.parse(String(init?.body)).events[0]
    expect(event).toMatchObject({
      name: "screen_view",
      source: "mobile",
      platform: "android",
      project: "halaalvest-mobile",
      appVersion: "0.1.0",
      appBuild: "9",
      route: "/members",
      properties: {},
    })
    return Response.json({ accepted: 1 }, { status: 202 })
  }) as typeof fetch
  expect((await mobile(await nativeRequestForTest())).status).toBe(202)
  const browserInput = request()
  browserInput.headers.delete("origin")
  expect((await mobile(browserInput)).status).toBe(400)
  const input = await nativeRequestForTest()
  const body = await input.json()
  body.events[0].platform = "ios"
  expect(
    (
      await mobile(
        new Request(input.url, { method: "POST", body: JSON.stringify(body) })
      )
    ).status
  ).toBe(400)
})
test("collector errors are generic and transport failures are bounded", async () => {
  configure()
  globalThis.fetch = (async (_url, init) => {
    expect(init?.signal).toBeDefined()
    return new Response("private collector diagnostics", { status: 500 })
  }) as typeof fetch
  expect(await (await POST(request())).text()).not.toContain(
    "private collector"
  )
  globalThis.fetch = Object.assign(
    async () => {
      throw new Error("offline")
    },
    { preconnect: originalFetch.preconnect }
  )
  expect((await POST(request())).status).toBe(502)
})
