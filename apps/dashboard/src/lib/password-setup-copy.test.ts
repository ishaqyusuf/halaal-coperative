import { describe, expect, test } from "bun:test"
import {
  getPasswordSetupCopy,
  getPasswordSetupError,
  parsePasswordSetupPurpose,
} from "./password-setup-copy"

describe("password setup copy", () => {
  test("only an explicit invite purpose switches to invite copy", () => {
    expect(parsePasswordSetupPurpose("invite")).toBe("invite")
    expect(parsePasswordSetupPurpose("reset")).toBe("reset")
    expect(parsePasswordSetupPurpose(undefined)).toBe("reset")
    expect(parsePasswordSetupPurpose(["invite"])).toBe("reset")
  })

  test("a first-time portal invite never reads as a password reset", () => {
    const copy = getPasswordSetupCopy("invite")

    for (const text of [
      copy.passwordLabel,
      copy.title,
      copy.description,
      ...Object.values(copy.errors),
    ]) {
      expect(text.toLowerCase()).not.toContain("reset")
    }
    expect(copy.loginNotice).toBe("invited")
  })

  test("reset copy keeps the reset wording", () => {
    expect(getPasswordSetupCopy("reset").title).toBe("Choose a new password")
    expect(getPasswordSetupCopy("reset").loginNotice).toBe("complete")
  })

  test("unknown errors fall back to the invalid-link message", () => {
    expect(getPasswordSetupError("invite", "nope")).toBe(
      getPasswordSetupCopy("invite").errors["invalid-token"]
    )
  })
})
