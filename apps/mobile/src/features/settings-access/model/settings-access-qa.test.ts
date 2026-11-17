import { describe, expect, test } from "bun:test"
import { getSettingsAccessQaState } from "./settings-access-qa"

describe("settings QA state", () => {
  test("supports known states only in development", () => {
    expect(getSettingsAccessQaState("offline", true)).toBe("offline")
    expect(getSettingsAccessQaState("signout-error", true)).toBe(
      "signout-error"
    )
    expect(getSettingsAccessQaState("unknown", true)).toBeNull()
    expect(getSettingsAccessQaState("signout-error", false)).toBeNull()
  })
})
