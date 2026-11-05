import { expect, test } from "bun:test"
import { createContextRefreshLoop } from "./browser-context"
import { createBrowserAnalytics } from "./browser"
import type { BrowserBatch } from "./contracts"

test("active same-page custom events renew context before expiry and failed renewal retries", async () => {
  let now = Date.now()
  let callback: (() => void) | undefined
  let delay = 0
  let fail = false
  let loads = 0
  let offline = true
  const batches: BrowserBatch[] = []
  const client = createBrowserAnalytics({
    project: "halaalvest-dashboard",
    now: () => now,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    send: async (batch) => {
      if (offline) throw Error("offline")
      batches.push(batch)
    },
  })
  const loop = createContextRefreshLoop({
    now: () => now,
    schedule: (next, milliseconds) => {
      callback = next
      delay = milliseconds
      return () => {
        callback = undefined
      }
    },
    pending: client.pauseCapture,
    load: async () => {
      loads++
      if (fail) throw Error("offline")
      return { token: `token-${loads}`, scope: "A", expiresAt: now + 3_600_000 }
    },
    apply: client.setContext,
  })
  await loop.refresh()
  expect(delay).toBe(3_540_000)
  client.track("application_started", { channel: "web" })
  await client.flush()
  now += delay
  fail = true
  callback?.()
  await Promise.resolve()
  await Promise.resolve()
  expect(delay).toBe(60_000)
  expect(client.track("application_started")).toBe(false)
  now += delay
  fail = false
  callback?.()
  await Promise.resolve()
  await Promise.resolve()
  expect(client.track("application_started")).toBe(true)
  await client.flush()
  offline = false
  await client.flush()
  expect(
    batches
      .flatMap((batch) => batch.events)
      .map((event) => event.analyticsContext)
  ).toEqual(["token-1", "token-3"])
  expect(delay).toBe(3_540_000)
  loop.dispose()
  expect(callback).toBeUndefined()
  const before = loads
  await loop.refresh()
  expect(loads).toBe(before)
  client.destroy()
})

test("a disabled policy is not polled and hidden pages skip timed refreshes", async () => {
  let callback: (() => void) | undefined
  let scheduled = 0
  let loads = 0
  let visible = true
  let context: { token: string; scope: string; expiresAt: number } | null =
    null
  const loop = createContextRefreshLoop({
    isActive: () => visible,
    schedule: (next) => {
      scheduled++
      callback = next
      return () => {
        callback = undefined
      }
    },
    pending: () => {},
    load: async () => {
      loads++
      return context
    },
    apply: () => {},
  })

  await loop.refresh()
  expect(loads).toBe(1)
  expect(scheduled).toBe(0)

  context = { token: "t", scope: "A", expiresAt: Date.now() + 3_600_000 }
  await loop.refresh()
  expect(scheduled).toBe(1)

  visible = false
  callback?.()
  await Promise.resolve()
  expect(loads).toBe(2)

  visible = true
  await loop.refresh()
  expect(loads).toBe(3)
  loop.dispose()
})
