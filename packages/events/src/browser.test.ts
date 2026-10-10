import { expect, test } from "bun:test"
import { createBrowserAnalytics } from "./browser"
import type { BrowserBatch } from "./contracts"
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}
test("queued browser events retain their capture token after context refresh", async () => {
  let offline = true
  const delivered: BrowserBatch[] = []
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: storage(),
    send: async (batch) => {
      if (offline) throw Error("offline")
      delivered.push(batch)
    },
  })
  client.setContext({
    token: "first",
    scope: "A",
    expiresAt: Date.now() + 60000,
  })
  client.trackPageView("/members/private")
  await client.flush()
  client.setContext({
    token: "refreshed",
    scope: "A",
    expiresAt: Date.now() + 60000,
  })
  offline = false
  await client.flush()
  expect(
    delivered[0]?.events.every((event) => event.analyticsContext === "first")
  ).toBe(true)
  client.destroy()
})
test("switch and logout discard pending scoped events and rotate visitor", async () => {
  const delivered: BrowserBatch[] = []
  let offline = false
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: storage(),
    send: async (batch) => {
      if (offline) throw Error("offline")
      delivered.push(batch)
    },
  })
  client.setContext({ token: "A", scope: "A", expiresAt: Date.now() + 60000 })
  client.trackPageView("/members")
  await client.flush()
  const firstVisitor = delivered[0]?.events[0]?.visitorId
  offline = true
  client.trackPageView("/reports")
  await client.flush()
  client.setContext({ token: "B", scope: "B", expiresAt: Date.now() + 60000 })
  offline = false
  client.trackPageView("/members")
  await client.flush()
  expect(
    delivered[1]?.events.every((event) => event.analyticsContext === "B")
  ).toBe(true)
  expect(delivered[1]?.events[0]?.visitorId).not.toBe(firstVisitor)
  client.setContext(null)
  client.trackPageView("/login")
  await client.flush()
  expect(delivered[2]?.events.every((event) => !event.analyticsContext)).toBe(
    true
  )
  client.destroy()
})

test("privacy signal changes discard queued events and persisted visitor before retry", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const signals = { doNotTrack: "0", globalPrivacyControl: false }
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: signals,
  })
  const store = storage()
  let attempts = 0
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: store,
    send: async () => {
      attempts++
      throw Error("offline")
    },
  })
  try {
    client.trackPageView("/members")
    await client.flush()
    const before = attempts
    signals.globalPrivacyControl = true
    await client.flush()
    expect(attempts).toBe(before)
    expect(store.getItem("logly:halaalvest-dashboard:visitor")).toBeNull()
    signals.globalPrivacyControl = false
    await client.flush()
    expect(attempts).toBe(before)
  } finally {
    client.destroy()
    if (prior) Object.defineProperty(globalThis, "navigator", prior)
    else Reflect.deleteProperty(globalThis, "navigator")
  }
})

test("expired scoped context pauses capture until renewal", async () => {
  let now = Date.now()
  const delivered: BrowserBatch[] = []
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: storage(),
    now: () => now,
    send: async (batch) => {
      delivered.push(batch)
    },
  })
  client.setContext({ token: "old", scope: "A", expiresAt: now + 1000 })
  now += 2000
  client.trackPageView("/members")
  await client.flush()
  expect(delivered).toHaveLength(0)
  client.setContext({ token: "new", scope: "A", expiresAt: now + 1000 })
  client.trackPageView("/members")
  await client.flush()
  expect(delivered[0]?.events[0]?.analyticsContext).toBe("new")
  client.destroy()
})

test("browser drains queued batches within the byte limit", async () => {
  let offline = true
  const delivered: BrowserBatch[] = []
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: storage(),
    send: async (batch) => {
      if (offline) throw Error("offline")
      delivered.push(batch)
    },
  })
  client.setContext({
    token: "x".repeat(4096),
    scope: "A",
    expiresAt: Date.now() + 60000,
  })
  for (let i = 0; i < 40; i++) {
    client.trackPageView(i % 2 ? "/reports" : "/members")
    await client.flush()
  }
  offline = false
  await client.flush()
  expect(delivered.length).toBeGreaterThan(1)
  expect(delivered.flatMap((batch) => batch.events)).toHaveLength(41)
  expect(
    delivered.every(
      (batch) =>
        new TextEncoder().encode(JSON.stringify(batch)).length <= 48 * 1024 &&
        batch.events.length <= 25
    )
  ).toBe(true)
  client.destroy()
})

test("full navigation logout and another account rotate the persisted visitor", async () => {
  const store = storage()
  const batches: BrowserBatch[] = []
  for (const context of [
    { token: "A", scope: "A", expiresAt: Date.now() + 60000 },
    null,
    { token: "B", scope: "B", expiresAt: Date.now() + 60000 },
  ]) {
    const client = createBrowserAnalytics({
      project: "halaalvest-dashboard",
      storage: store,
      send: async (batch) => {
        batches.push(batch)
      },
    })
    client.setContext(context)
    client.trackPageView("/members")
    await client.flush()
    client.destroy()
  }
  expect(batches).toHaveLength(3)
  expect(new Set(batches.map((batch) => batch.events[0]?.visitorId)).size).toBe(
    3
  )
})

test("browser custom events validate names, preserve permitted metadata and wait for current context", async () => {
  const batches: BrowserBatch[] = []
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    storage: storage(),
    send: async (batch) => {
      batches.push(batch)
    },
  })
  expect(client.track("application_started")).toBe(false)
  client.setContext({
    token: "signed",
    scope: "A",
    expiresAt: Date.now() + 60000,
  })
  expect(client.track("Bad Event")).toBe(false)
  expect(
    client.track("application_started", {
      channel: "web",
      item_count: 2,
      email: "private",
    })
  ).toBe(true)
  await client.flush()
  expect(batches[0]?.events[0]).toMatchObject({
    name: "application_started",
    analyticsContext: "signed",
    properties: { channel: "web", item_count: 2 },
  })
  expect(batches[0]?.events[0]?.properties).not.toHaveProperty("email")
  client.pauseCapture()
  expect(client.track("application_started")).toBe(false)
  client.destroy()
})
