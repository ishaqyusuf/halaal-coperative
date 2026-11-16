import { describe, expect, it } from "bun:test"
import {
  formatResendCountdown,
  getInitialRecoveryStep,
  getPasswordRules,
  getSignInFieldErrors,
  isAcceptablePassword,
  isLikelyEmail,
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

describe("recovery rules", () => {
  it("formats the resend countdown", () => {
    expect(formatResendCountdown(45)).toBe("0:45")
    expect(formatResendCountdown(4.2)).toBe("0:05")
    expect(formatResendCountdown(-3)).toBe("0:00")
    expect(formatResendCountdown(75)).toBe("1:15")
  })

  it("mirrors the server password rule", () => {
    expect(isAcceptablePassword("short1")).toBe(false)
    expect(isAcceptablePassword("lettersonly")).toBe(false)
    expect(isAcceptablePassword("12345678")).toBe(false)
    expect(isAcceptablePassword("letters123")).toBe(true)
    expect(getPasswordRules("abc").map((rule) => rule.met)).toEqual([
      false,
      false,
    ])
  })

  it("checks emails lightly", () => {
    expect(isLikelyEmail(" aisha@amana.example ")).toBe(true)
    expect(isLikelyEmail("aisha@amana")).toBe(false)
    expect(isLikelyEmail("aisha")).toBe(false)
  })

  it("names each empty sign-in field", () => {
    expect(getSignInFieldErrors({ cooperativeNumber: " ", password: "" })).toEqual({
      cooperativeNumber: "Enter your cooperative number",
      password: "Enter your password",
    })
    expect(
      getSignInFieldErrors({ cooperativeNumber: "QHC-1", password: "x" })
    ).toEqual({})
  })
})
