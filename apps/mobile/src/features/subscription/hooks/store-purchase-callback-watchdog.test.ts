import { describe, expect, test } from "bun:test"
import { createStorePurchaseCallbackWatchdog } from "./store-purchase-callback-watchdog"

function harness() {
  const callbacks = new Map<number, () => void>()
  let nextTimer = 0
  let missing = 0
  const watchdog = createStorePurchaseCallbackWatchdog(
    () => missing++,
    (callback, delay) => {
      expect(delay).toBe(30_000)
      const id = ++nextTimer
      callbacks.set(id, callback)
      return id as unknown as ReturnType<typeof setTimeout>
    },
    (timer) => callbacks.delete(timer as unknown as number)
  )
  return {
    callbacks,
    get missing() {
      return missing
    },
    watchdog,
  }
}

describe("store purchase callback watchdog", () => {
  test("releases a dispatched purchase with no listener outcome", () => {
    const state = harness()
    state.watchdog.dispatched(state.watchdog.begin("plan-a"))
    expect(state.callbacks.size).toBe(1)
    for (const callback of state.callbacks.values()) callback()
    expect(state.missing).toBe(1)
  })

  test("a listener outcome or scope disposal cancels recovery", () => {
    const state = harness()
    state.watchdog.dispatched(state.watchdog.begin("plan-a"))
    state.watchdog.observed("plan-a")
    expect(state.callbacks.size).toBe(0)
    state.watchdog.dispatched(state.watchdog.begin("plan-b"))
    state.watchdog.cancel()
    expect(state.callbacks.size).toBe(0)
    expect(state.missing).toBe(0)
  })

  test("a callback observed before request return does not start a stale wait", () => {
    const state = harness()
    const request = state.watchdog.begin("plan-a")
    state.watchdog.observed("plan-a")
    state.watchdog.dispatched(request)
    expect(state.callbacks.size).toBe(0)
  })

  test("an unrelated restored purchase does not hide a missing callback", () => {
    const state = harness()
    const request = state.watchdog.begin("plan-b")
    state.watchdog.observed("plan-a")
    expect(state.watchdog.pending()).toBe(true)
    state.watchdog.dispatched(request)
    expect(state.callbacks.size).toBe(1)
  })

  test("an unrelated or unidentified error cannot unlock a pending checkout", () => {
    const state = harness()
    const request = state.watchdog.begin("plan-b")
    state.watchdog.dispatched(request)
    expect(state.watchdog.observedError("plan-a")).toBe(false)
    expect(state.watchdog.observedError(null, ["plan-a"])).toBe(false)
    expect(state.watchdog.observedError()).toBe(false)
    expect(state.watchdog.pending()).toBe(true)
    expect(state.callbacks.size).toBe(1)
  })

  test("a matching error resolves the pending checkout by either product field", () => {
    for (const match of [
      (watchdog: ReturnType<typeof createStorePurchaseCallbackWatchdog>) =>
        watchdog.observedError("plan-b"),
      (watchdog: ReturnType<typeof createStorePurchaseCallbackWatchdog>) =>
        watchdog.observedError(null, ["plan-a", "plan-b"]),
    ]) {
      const state = harness()
      const request = state.watchdog.begin("plan-b")
      state.watchdog.dispatched(request)
      expect(match(state.watchdog)).toBe(true)
      expect(state.watchdog.pending()).toBe(false)
      expect(state.callbacks.size).toBe(0)
    }
  })
})
