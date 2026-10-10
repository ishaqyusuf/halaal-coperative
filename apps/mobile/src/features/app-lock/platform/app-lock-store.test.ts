import { describe, expect, test } from "bun:test"

import type { AppLockIdentity } from "@/features/app-lock/model/app-lock-types"
import { createAppLockStore } from "../model/app-lock-store-core"

function createMemoryStore() {
  const values = new Map<string, string>()
  return {
    deleteItem: async (key: string) => {
      values.delete(key)
    },
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value)
    },
    values,
  }
}

function createHarness() {
  let now = Date.parse("2026-08-29T12:00:00.000Z")
  const markerStore = createMemoryStore()
  const secureStore = createMemoryStore()
  const store = createAppLockStore({
    digest: async (value) => `hash:${value}`,
    markerStore,
    now: () => now,
    randomBytes: async (count) => new Uint8Array(count).fill(7),
    secureStore,
  })
  return {
    advance: (milliseconds: number) => {
      now += milliseconds
    },
    markerStore,
    secureStore,
    store,
  }
}

const identity: AppLockIdentity = {
  deviceId: "device-qa",
  userId: "user-qa",
}

describe("mobile app lock secure store", () => {
  test("cold launch reads a configured user and device lock", async () => {
    const harness = createHarness()
    await harness.store.setCode(identity, "246810")

    const result = await harness.store.read(identity)
    expect(result.status).toBe("configured")
    if (result.status === "configured") {
      expect(result.config.relockAfterMs).toBe(0)
      expect(result.config.codeHash).not.toBe("246810")
    }
  })

  test("corrupt secure storage fails closed instead of appearing unconfigured", async () => {
    const harness = createHarness()
    await harness.store.setCode(identity, "246810")
    const [secureKey] = harness.secureStore.values.keys()
    expect(secureKey).toBeTruthy()
    harness.secureStore.values.set(secureKey!, "not-json")

    expect(await harness.store.read(identity)).toEqual({
      config: null,
      reason: "corrupt_config",
      status: "error",
    })
  })

  test("a secure-store reset is detected through the non-sensitive marker", async () => {
    const harness = createHarness()
    await harness.store.setCode(identity, "246810")
    harness.secureStore.values.clear()

    expect(await harness.store.read(identity)).toEqual({
      config: null,
      reason: "missing_secure_config",
      status: "error",
    })
  })

  test("failed attempts are persisted and bounded by a temporary lockout", async () => {
    const harness = createHarness()
    await harness.store.setCode(identity, "246810")

    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await harness.store.verifyCode(identity, "111111")).reason).toBe(
        "invalid"
      )
    }
    const locked = await harness.store.verifyCode(identity, "111111")
    expect(locked.reason).toBe("locked")
    expect((await harness.store.verifyCode(identity, "246810")).reason).toBe(
      "locked"
    )

    harness.advance(30_000)
    expect((await harness.store.verifyCode(identity, "246810")).ok).toBe(true)
  })

  test("session revocation cleanup removes secure config and its marker", async () => {
    const harness = createHarness()
    await harness.store.setCode(identity, "246810")
    await harness.store.clear(identity)

    expect(await harness.store.read(identity)).toEqual({
      config: null,
      status: "missing",
    })
  })
})
