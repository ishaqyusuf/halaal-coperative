import { describe, expect, test } from "bun:test"
import {
  getPinFlowCopy,
  getVerificationMessage,
  RELOCK_OPTIONS,
  type PinFlow,
} from "./app-lock-settings-copy"

describe("app lock settings copy", () => {
  test("every PIN step has a title, body and header step", () => {
    const flows: PinFlow[] = [
      "biometrics-verify",
      "change-confirm",
      "change-create",
      "change-verify",
      "disable-verify",
      "setup-confirm",
      "setup-create",
    ]
    for (const flow of flows) {
      const copy = getPinFlowCopy(flow)
      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.body.length).toBeGreaterThan(0)
      expect(copy.step).toMatch(/^(Step [12] of 2|Security check)$/)
    }
  })

  test("verification failures map to plain messages", () => {
    expect(getVerificationMessage({ ok: true } as never)).toBeNull()
    expect(getVerificationMessage({ ok: false, reason: "mismatch" } as never)).toBe("That PIN did not match.")
    expect(getVerificationMessage({ ok: false, reason: "locked" } as never)).toMatch(/Too many attempts/)
    expect(getVerificationMessage({ ok: false, reason: "storage_error" } as never)).toMatch(/Sign out securely/)
  })

  test("relock offers immediately, 1 and 5 minutes", () => {
    expect(RELOCK_OPTIONS.map((option) => option.value)).toEqual([0, 60_000, 300_000])
  })
})
