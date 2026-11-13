import { describe, expect, test } from "bun:test"
import { getLoanIntakeFix, loanIntakeFixHref } from "./loan-intake-fix"

describe("loan intake fix link", () => {
  test("points finance managers to Finance settings when intake is blocked", () => {
    expect(
      getLoanIntakeFix({
        canManageFinance: true,
        intakeStatus: "missing",
        productCount: 2,
      })
    ).toEqual({ href: loanIntakeFixHref, label: "Open this month's financing" })
    expect(
      getLoanIntakeFix({
        canManageFinance: true,
        intakeStatus: "paused",
        productCount: 2,
      })?.label
    ).toBe("Resume financing")
  })

  test("asks for products first when none can be requested", () => {
    expect(
      getLoanIntakeFix({
        canManageFinance: true,
        intakeStatus: "open",
        productCount: 0,
      })
    ).toEqual({ href: loanIntakeFixHref, label: "Set up financing products" })
  })

  test("is absent when intake is open or the viewer cannot fix it", () => {
    expect(
      getLoanIntakeFix({
        canManageFinance: true,
        intakeStatus: "open",
        productCount: 2,
      })
    ).toBeNull()
    expect(
      getLoanIntakeFix({
        canManageFinance: false,
        intakeStatus: "missing",
        productCount: 0,
      })
    ).toBeNull()
  })
})
