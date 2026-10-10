import { describe, expect, test } from "bun:test"
import { transitionMobileContext } from "./mobile-context-transition"

describe("mobile context transition", () => {
  test("does not clear the current context when the server switch fails", async () => {
    const calls: string[] = []

    await expect(
      transitionMobileContext({
        clearDrafts: async () => void calls.push("drafts"),
        clearFiles: () => void calls.push("files"),
        clearReads: async () => void calls.push("reads"),
        loadNextContext: async () => {
          calls.push("load")
          throw new Error("switch denied")
        },
        persistNextContext: async () => void calls.push("persist"),
      })
    ).rejects.toThrow("switch denied")

    expect(calls).toEqual(["load"])
  })

  test("clears scoped state before persisting the new context", async () => {
    const calls: string[] = []
    const result = await transitionMobileContext({
      clearDrafts: async () => void calls.push("drafts"),
      clearFiles: () => void calls.push("files"),
      clearReads: async () => void calls.push("reads"),
      loadNextContext: async () => {
        calls.push("load")
        return { id: "next" }
      },
      persistNextContext: async () => void calls.push("persist"),
    })

    expect(result).toEqual({ id: "next" })
    expect(calls).toEqual(["load", "drafts", "files", "reads", "persist"])
  })
})
