import { describe, expect, test } from "bun:test"
import {
  assistantIdParam,
  assistantLinkTarget,
  assistantLinkUrl,
} from "./assistant-saved-link"

const id = "4f6c1d2e-9a7b-4c3d-8e1f-0a2b3c4d5e6f"

describe("assistant saved links", () => {
  test("accepts plain ids only", () => {
    expect(assistantLinkTarget("message", id)).toEqual({ kind: "message", id })
    expect(assistantLinkTarget("proposal", id)).toEqual({ kind: "proposal", id })
    for (const bad of [undefined, "", "../x", "a b", "a/b", ["a"], "x".repeat(129)])
      expect(assistantLinkTarget("message", bad as never)).toBeNull()
    expect(assistantIdParam("a?b")).toBeUndefined()
  })

  test("builds the website path on the dashboard origin", () => {
    expect(
      assistantLinkUrl("https://app.halaalvest.com/", { kind: "message", id })
    ).toBe(`https://app.halaalvest.com/assistant/m/${id}`)
    expect(
      assistantLinkUrl("https://app.halaalvest.com", { kind: "proposal", id })
    ).toBe(`https://app.halaalvest.com/assistant/review/${id}`)
  })
})
