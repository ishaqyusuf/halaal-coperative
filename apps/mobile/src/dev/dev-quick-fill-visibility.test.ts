import { describe, expect, test } from "bun:test"
import { shouldShowDevQuickFill } from "./dev-quick-fill-visibility"

const authorized = {
  hasDeviceQaAuthorization: false,
  isDevFixtureSession: false,
  isFocused: true,
  isKeyboardVisible: false,
  isQaClientBuild: true,
  placement: "footer" as const,
  sessionQaAuthorized: true,
}

describe("mobile Quick Fill visibility (triage 5.11: web only)", () => {
  test("an ordinary signed-in user in a Preview build sees no footer Quick Fill", () => {
    expect(
      shouldShowDevQuickFill({ ...authorized, sessionQaAuthorized: false })
    ).toBe(false)
    expect(
      shouldShowDevQuickFill({
        ...authorized,
        placement: "floating",
        sessionQaAuthorized: false,
      })
    ).toBe(false)
  })

  test("QA sessions, QA devices and dev fixtures keep Quick Fill in every placement", () => {
    for (const placement of ["footer", "floating"] as const) {
      expect(shouldShowDevQuickFill({ ...authorized, placement })).toBe(true)
      expect(
        shouldShowDevQuickFill({
          ...authorized,
          hasDeviceQaAuthorization: true,
          placement,
          sessionQaAuthorized: false,
        })
      ).toBe(true)
      expect(
        shouldShowDevQuickFill({
          ...authorized,
          isDevFixtureSession: true,
          placement,
          sessionQaAuthorized: false,
        })
      ).toBe(true)
    }
  })

  test("never outside a QA client build, and never over the keyboard", () => {
    expect(
      shouldShowDevQuickFill({ ...authorized, isQaClientBuild: false })
    ).toBe(false)
    expect(
      shouldShowDevQuickFill({ ...authorized, isKeyboardVisible: true })
    ).toBe(false)
  })

  test("a floating control needs a focused screen; a footer one rides its form", () => {
    expect(
      shouldShowDevQuickFill({
        ...authorized,
        isFocused: false,
        placement: "floating",
      })
    ).toBe(false)
    expect(shouldShowDevQuickFill({ ...authorized, isFocused: false })).toBe(
      true
    )
  })
})
