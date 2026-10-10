import { expect, test } from "bun:test"
import type { NativeBatch as AnalyticsBatch } from "./contracts"
import { createNativeAnalytics } from "./native"

test("native queues failed delivery, removes private routes and rolls UTC visit days", async () => {
  const values = new Map<string, string>()
  const batches: AnalyticsBatch[] = []
  let fail = true
  let time = new Date("2026-09-07T23:59:00Z")
  const client = createNativeAnalytics({
    endpoint: "https://example.com",
    enabled: true,
    appVersion: "0.1.0",
    appBuild: "9",
    createId: () => crypto.randomUUID(),
    now: () => time,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value)
      },
      removeItem: (key) => {
        values.delete(key)
      },
    },
    send: async (batch) => {
      if (fail) throw new Error("offline")
      batches.push(batch)
    },
  })
  try {
    client.init()
    client.trackPageView({ route: "/members/private-id?email=secret" })
    await client.flush()
    expect(batches).toHaveLength(0)
    fail = false
    await client.flush()
    expect(batches[0]?.events[0]).toMatchObject({
      source: "mobile",
      platform: "android",
      appVersion: "0.1.0",
      appBuild: "9",
    })
    expect(batches[0]?.events.map((event) => event.name)).toEqual([
      "app_session",
      "screen_view",
    ])
    expect(
      batches[0]?.events.every(
        (event) =>
          event.route === "/members" && event.project === "halaalvest-mobile"
      )
    ).toBe(true)
    client.trackPageView({ route: "/members/private-id" })
    await client.flush()
    expect(batches).toHaveLength(1)
    time = new Date("2026-09-08T00:01:00Z")
    client.trackPageView({ route: "/members/private-id" })
    await client.flush()
    expect(batches[1]?.events[0]?.visitKind).toBe("returning")
    expect(batches[1]?.events[0]?.visitorId).toBe(
      batches[0]?.events[0]?.visitorId
    )
  } finally {
    client.destroy()
  }
})
test("storage failures and disabled tracking never send or throw", async () => {
  let sent = 0
  for (const enabled of [true, false]) {
    const client = createNativeAnalytics({
      endpoint: "https://example.com",
      enabled,
      createId: () => crypto.randomUUID(),
      storage: {
        getItem: () => {
          throw new Error("locked")
        },
        setItem: () => {},
        removeItem: () => {},
      },
      send: async () => {
        sent++
      },
    })
    expect(() => client.init()).not.toThrow()
    client.trackPageView({ route: "/" })
    await client.flush()
    client.destroy()
  }
  expect(sent).toBe(0)
})

test("native context is copied at capture and logout reset drops queued identities", async () => {
  let offline = true
  const batches: AnalyticsBatch[] = []
  const context = {
    token: "signed-A",
    scope: "A",
    expiresAt: Date.now() + 60000,
  }
  const client = createNativeAnalytics({
    endpoint: "https://example.test",
    enabled: true,
    context,
    createId: () => crypto.randomUUID(),
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    send: async (batch) => {
      if (offline) throw Error("offline")
      batches.push(batch)
    },
  })
  client.init()
  client.trackPageView({ route: "/members" })
  await client.flush()
  context.token = "signed-B"
  offline = false
  await client.flush()
  expect(
    batches[0]?.events.every((event) => event.analyticsContext === "signed-A")
  ).toBe(true)
  offline = true
  client.trackPageView({ route: "/reports" })
  await client.flush()
  client.reset()
  offline = false
  await client.flush()
  expect(batches).toHaveLength(1)
  client.destroy()
})

test("native same-scope renewal preserves retries, pauses expired capture, and drains byte-bounded batches", async () => {
  let now = new Date()
  let offline = true
  const batches: AnalyticsBatch[] = []
  const client = createNativeAnalytics({
    endpoint: "https://example.test",
    enabled: true,
    now: () => now,
    createId: () => crypto.randomUUID(),
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    send: async (batch) => {
      if (offline) throw Error("offline")
      batches.push(batch)
    },
  })
  client.init()
  client.setContext({
    token: "x".repeat(4096),
    scope: "A",
    expiresAt: now.getTime() + 1000,
  })
  for (let i = 0; i < 40; i++) {
    client.trackPageView({ route: i % 2 ? "/reports" : "/members" })
    await client.flush()
  }
  now = new Date(now.getTime() + 2000)
  client.trackPageView({ route: "/settings" })
  client.setContext({
    token: "new",
    scope: "A",
    expiresAt: now.getTime() + 1000,
  })
  offline = false
  await client.flush()
  expect(batches.flatMap((batch) => batch.events)).toHaveLength(41)
  expect(
    batches
      .flatMap((batch) => batch.events)
      .every((event) => event.analyticsContext === "x".repeat(4096))
  ).toBe(true)
  expect(
    batches.every(
      (batch) =>
        new TextEncoder().encode(JSON.stringify(batch)).length <= 48 * 1024
    )
  ).toBe(true)
  client.trackPageView({ route: "/settings" })
  await client.flush()
  expect(batches.at(-1)?.events[0]?.analyticsContext).toBe("new")
  client.destroy()
})

test("native custom event API validates names and snapshots permitted properties", async () => {
  const batches: AnalyticsBatch[] = []
  const client = createNativeAnalytics({
    endpoint: "https://example.test",
    enabled: true,
    createId: () => crypto.randomUUID(),
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    send: async (batch) => {
      batches.push(batch)
    },
  })
  client.init()
  client.setContext({
    token: "signed",
    scope: "A",
    expiresAt: Date.now() + 60000,
  })
  expect(client.track("Bad Event")).toBe(false)
  const properties = { channel: "mobile", email: "private" }
  expect(client.track("application_started", properties)).toBe(true)
  properties.channel = "changed"
  await client.flush()
  expect(batches[0]?.events[0]).toMatchObject({
    name: "application_started",
    analyticsContext: "signed",
    properties: { channel: "mobile" },
  })
  expect(batches[0]?.events[0]?.properties).not.toHaveProperty("email")
  client.destroy()
})
