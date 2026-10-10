import { describe, expect, test } from "bun:test"
import { createStorePurchaseBusyReleaseGate } from "./store-purchase-busy-release"
import { createStorePurchaseEventGuard } from "./store-purchase-event-guard"
import { createStorePurchaseCallbackWatchdog } from "./store-purchase-callback-watchdog"

describe("store purchase busy release", () => {
  test("restore finishing first cannot unlock an ongoing purchase verification", () => {
    const gate = createStorePurchaseBusyReleaseGate()
    const purchases = createStorePurchaseEventGuard()
    gate.beginRestore()
    expect(purchases.begin("apple:transaction-a")).toBe(true)
    expect(gate.canRelease(purchases.hasInFlight(), false)).toBe(false)
    gate.endRestore()
    expect(gate.canRelease(purchases.hasInFlight(), false)).toBe(false)
    purchases.done("apple:transaction-a")
    expect(gate.canRelease(purchases.hasInFlight(), false)).toBe(true)
  })

  test("purchase verification finishing first cannot unlock an ongoing restore", () => {
    const gate = createStorePurchaseBusyReleaseGate()
    const purchases = createStorePurchaseEventGuard()
    gate.beginRestore()
    expect(purchases.begin("google:purchase-a")).toBe(true)
    purchases.done("google:purchase-a")
    expect(gate.canRelease(purchases.hasInFlight(), false)).toBe(false)
    gate.endRestore()
    expect(gate.canRelease(purchases.hasInFlight(), false)).toBe(true)
  })

  test("a dispatched checkout remains busy until its callback resolves or times out", () => {
    const gate = createStorePurchaseBusyReleaseGate()
    const watchdog = createStorePurchaseCallbackWatchdog(() => {})
    const request = watchdog.begin("monthly-plan")
    watchdog.dispatched(request)
    expect(gate.canRelease(false, watchdog.pending())).toBe(false)
    watchdog.observed("monthly-plan")
    expect(gate.canRelease(false, watchdog.pending())).toBe(true)
  })
})
