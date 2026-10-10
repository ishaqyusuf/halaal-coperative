import { describe, expect, test } from "bun:test"
import { shouldFinishNativeStoreTransaction } from "./store-transaction-finalization"

describe("native store transaction finalization", () => {
  test("finishes a granted Apple purchase", () => {
    expect(shouldFinishNativeStoreTransaction("apple", true)).toBe(true)
  })

  test("leaves an unapplied Apple purchase for recovery", () => {
    expect(shouldFinishNativeStoreTransaction("apple", false)).toBe(false)
  })

  test("never acknowledges Google from the device, regardless of application result", () => {
    expect(shouldFinishNativeStoreTransaction("google", true)).toBe(false)
    expect(shouldFinishNativeStoreTransaction("google", false)).toBe(false)
  })
})
