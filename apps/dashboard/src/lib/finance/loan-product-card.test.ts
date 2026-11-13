import { describe, expect, test } from "bun:test"
import { getLoanProductCardState } from "./loan-product-card"

describe("Finance settings loan product card", () => {
  test("shows a missing product as not set up, never active", () => {
    expect(
      getLoanProductCardState({
        id: null,
        isActive: false,
        loanType: "quick",
        name: "Quick financing",
      })
    ).toEqual({
      actionLabel: "Set up quick product",
      description:
        "No quick product yet. Members can't request quick financing until you set one up.",
      pill: "not set up",
      tone: "warning",
    })
  })

  test("reflects a real row's active state", () => {
    expect(
      getLoanProductCardState({
        id: "product-1",
        isActive: true,
        loanType: "normal",
        name: "Normal financing",
      })
    ).toMatchObject({ actionLabel: "Edit normal product", pill: "active" })
    expect(
      getLoanProductCardState({
        id: "product-2",
        isActive: false,
        loanType: "normal",
        name: "Normal financing",
      })
    ).toMatchObject({ pill: "inactive", tone: "warning" })
  })
})
