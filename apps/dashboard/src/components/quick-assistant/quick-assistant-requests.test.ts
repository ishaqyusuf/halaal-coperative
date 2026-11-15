import { describe, expect, test } from "bun:test"
import {
  askAssistant,
  isQuickAssistantShortcut,
  memberHistoryDraft,
  receiptReviewDraft,
  requestQuickAssistant,
} from "./quick-assistant-requests"

const key = (over: Partial<Parameters<typeof isQuickAssistantShortcut>[0]>) => ({
  key: "j",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
})

describe("quick assistant requests", () => {
  test("⌘J and Ctrl+J open it; plain J, ⌘K and modified J don't", () => {
    expect(isQuickAssistantShortcut(key({ metaKey: true }))).toBe(true)
    expect(isQuickAssistantShortcut(key({ ctrlKey: true, key: "J" }))).toBe(true)
    expect(isQuickAssistantShortcut(key({}))).toBe(false)
    expect(isQuickAssistantShortcut(key({ metaKey: true, key: "k" }))).toBe(false)
    expect(isQuickAssistantShortcut(key({ metaKey: true, shiftKey: true }))).toBe(false)
  })

  test("prefills name the record and route to the matching staff reads", () => {
    expect(memberHistoryDraft("OPA-7641")).toBe("Show OPA-7641's history")
    expect(receiptReviewDraft("OPA-7641")).toBe(
      "Show OPA-7641's statement and recent receipts"
    )
  })

  test("without a mounted launcher the request falls back to the page", () => {
    const target = new EventTarget()
    const previous = globalThis.window
    // biome-ignore lint/suspicious/noExplicitAny: minimal window for dispatch
    ;(globalThis as any).window = target
    try {
      let opened = 0
      expect(requestQuickAssistant()).toBe(false)
      askAssistant("Show OPA-1's history", () => opened++)
      expect(opened).toBe(1)
      target.addEventListener("halaalvest:open-quick-assistant", (event) =>
        event.preventDefault()
      )
      askAssistant("Show OPA-1's history", () => opened++)
      expect(opened).toBe(1)
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).window = previous
    }
  })
})
