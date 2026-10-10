import { describe, expect, test } from "bun:test"

import { executeWithProductionQaSessionCleanup } from "./production-qa-mobile-session"

describe("production QA mobile session lifecycle", () => {
  test("waits for journey execution before starting session cleanup", async () => {
    const events: string[] = []
    let completeJourney: ((value: string) => void) | null = null
    const journey = new Promise<string>((resolve) => {
      completeJourney = resolve
    })

    const resultPromise = executeWithProductionQaSessionCleanup({
      cleanup: async () => {
        events.push("cleanup")
      },
      execute: async () => {
        events.push("execute")
        return await journey
      },
    })

    await Promise.resolve()
    expect(events).toEqual(["execute"])

    completeJourney?.("passed")

    await expect(resultPromise).resolves.toBe("passed")
    expect(events).toEqual(["execute", "cleanup"])
  })

  test("still cleans up after journey execution fails", async () => {
    const events: string[] = []

    await expect(
      executeWithProductionQaSessionCleanup({
        cleanup: async () => {
          events.push("cleanup")
        },
        execute: async () => {
          events.push("execute")
          throw new Error("journey failed")
        },
      })
    ).rejects.toThrow("journey failed")
    expect(events).toEqual(["execute", "cleanup"])
  })
})
