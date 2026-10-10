import { describe, expect, it } from "bun:test"
import {
  getInitialRecoveryStep,
  maskRecoveryEmail,
  normalizeRecoveryCode,
} from "./recovery-flow"

describe("recovery flow", () => {
  it("normalizes recovery codes to six numeric characters", () => {
    expect(normalizeRecoveryCode("48a2-7319")).toBe("482731")
  })

  it("masks the recovery destination without hiding the domain", () => {
    expect(maskRecoveryEmail("Ishaq@QA.Test ")).toBe("i••••@qa.test")
  })

  it("does not echo malformed recovery destinations", () => {
    expect(maskRecoveryEmail("not-an-email")).toBe("your email")
  })

  it("starts deep-linked challenges on the code step", () => {
    expect(getInitialRecoveryStep("challenge-1")).toBe("code")
    expect(getInitialRecoveryStep()).toBe("request")
  })
})
