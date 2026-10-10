import { describe, expect, test } from "bun:test"
import { createStorePurchaseVerificationFlight } from "./store-purchase-verification-flight"

describe("store purchase verification flight", () => {
  test("Restore and a listener share one verification for the same receipt", async () => {
    const verifyOnce = createStorePurchaseVerificationFlight<boolean>()
    let calls = 0
    let finish: ((result: boolean) => void) | undefined
    const verify = () => {
      calls += 1
      return new Promise<boolean>((resolve) => {
        finish = resolve
      })
    }

    const listener = verifyOnce("apple:transaction-a", verify)
    const restore = verifyOnce("apple:transaction-a", verify)
    expect(listener).toBe(restore)
    await Promise.resolve()
    expect(calls).toBe(1)
    finish?.(true)
    expect(await Promise.all([listener, restore])).toEqual([true, true])
    expect(await verifyOnce("apple:transaction-a", async () => false)).toBe(
      false
    )
  })

  test("a failed verification can be retried after the in-flight call ends", async () => {
    const verifyOnce = createStorePurchaseVerificationFlight<boolean>()
    const failure = verifyOnce("google:token-a", async () => {
      throw new Error("provider unavailable")
    })
    expect(verifyOnce("google:token-a", async () => true)).toBe(failure)
    await expect(failure).rejects.toThrow("provider unavailable")
    expect(await verifyOnce("google:token-a", async () => true)).toBe(true)
  })

  test("different receipts retain independent verification", async () => {
    const verifyOnce = createStorePurchaseVerificationFlight<string>()
    const results = await Promise.all([
      verifyOnce("apple:transaction-a", async () => "first"),
      verifyOnce("apple:transaction-b", async () => "second"),
    ])
    expect(results).toEqual(["first", "second"])
  })
})
