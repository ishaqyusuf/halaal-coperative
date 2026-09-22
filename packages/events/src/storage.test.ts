import { expect, test } from "bun:test"
import { createAnalytics } from "@ishaqyusuf/logly-core"
import { createSafeBrowserStorage } from "./storage"

test("blocked storage getters and quota errors never interrupt analytics setup", async () => {
  for (const resolve of [
    () => {
      throw new Error("SecurityError")
    },
    () => ({
      length: 0,
      key: () => null,
      clear: () => {},
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
      removeItem: () => {
        throw new Error("SecurityError")
      },
    }),
  ]) {
    const storage = createSafeBrowserStorage(resolve)
    expect(() => storage.setItem("key", "value")).not.toThrow()
    expect(storage.getItem("key")).toBe("value")
    storage.removeItem("key")
    expect(storage.getItem("key")).toBeNull()
    for (const disabled of [true, false]) {
      const client = createAnalytics({
        project: "halaalvest-dashboard",
        storage,
        disabled,
        transport: async () => {
          throw new Error("offline")
        },
      })
      try {
        expect(() => client.init()).not.toThrow()
        expect(() => client.trackPageView({ route: "/login" })).not.toThrow()
        await expect(client.flush()).resolves.toBeUndefined()
      } finally {
        client.destroy()
      }
    }
  }
})
