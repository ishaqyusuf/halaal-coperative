import { describe, expect, test } from "bun:test"
import { createStorePurchaseEventGuard } from "./store-purchase-event-guard"

describe("store purchase event guard", () => {
  test("deduplicates an in-flight and recently finished transaction but permits a later refresh", () => {
    let time = 1_000
    const guard = createStorePurchaseEventGuard(() => time)
    expect(guard.begin("apple:transaction-a")).toBe(true)
    expect(guard.begin("apple:transaction-a")).toBe(false)
    expect(guard.hasInFlight()).toBe(true)
    guard.applied("apple:transaction-a")
    guard.done("apple:transaction-a")
    expect(guard.begin("apple:transaction-a")).toBe(false)
    time += 10_000
    expect(guard.begin("apple:transaction-a")).toBe(true)
  })

  test("allows immediate retry after failed verification and bounds transient error suppression", () => {
    let time = 1_000
    const guard = createStorePurchaseEventGuard(() => time)
    expect(guard.begin("google:purchase-a")).toBe(true)
    expect(guard.ignorePurchaseError("service-error")).toBe(true)
    expect(guard.ignorePurchaseError("user-cancelled")).toBe(true)
    guard.done("google:purchase-a")
    expect(guard.begin("google:purchase-a")).toBe(true)
    guard.applied("google:purchase-a")
    guard.done("google:purchase-a")
    time += 1_499
    expect(guard.ignorePurchaseError("service-error")).toBe(true)
    expect(guard.ignorePurchaseError("user-cancelled")).toBe(false)
    time += 1
    expect(guard.ignorePurchaseError("service-error")).toBe(false)
  })

  test("does not classify an unapplied callback as recent success", () => {
    const guard = createStorePurchaseEventGuard(() => 1_000)
    expect(guard.begin("google:unapplied-token")).toBe(true)
    guard.done("google:unapplied-token")
    expect(guard.ignorePurchaseError("service-error")).toBe(false)
    expect(guard.begin("google:unapplied-token")).toBe(true)
  })
})
