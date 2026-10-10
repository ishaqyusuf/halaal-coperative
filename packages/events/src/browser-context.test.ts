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
