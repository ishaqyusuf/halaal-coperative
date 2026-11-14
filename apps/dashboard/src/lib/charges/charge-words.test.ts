import { describe, expect, test } from "bun:test"
import {
  formatChargeAmount,
  getChargeAppliesToWords,
  getChargeCorrections,
  getChargeStatusWord,
} from "./charge-words"

describe("charge words", () => {
  test("shows a percentage charge as a percent, not naira", () => {
    expect(formatChargeAmount(2, "percentage")).toBe("2%")
    expect(formatChargeAmount(2.5, "percentage")).toBe("2.5%")
    expect(formatChargeAmount(7500, "fixed_amount")).toContain("7,500")
  })

  test("names who pays in plain words", () => {
    expect(getChargeAppliesToWords([])).toBe("Added by staff")
    expect(
      getChargeAppliesToWords(["monthly_collection", "loan_request"])
    ).toBe("Monthly payments, Loan requests")
  })

  test("gives one status word per member charge", () => {
    expect(getChargeStatusWord("pending", "pay_separately").label).toBe(
      "Not paid yet"
    )
    expect(getChargeStatusWord("posted", "pay_separately").label).toBe("Paid")
    expect(getChargeStatusWord("posted", "deduct_from_savings").label).toBe(
      "Taken from savings"
    )
    expect(getChargeStatusWord("reversed", "deduct_from_savings").label).toBe(
      "Undone"
    )
  })

  test("offers only the corrections the server allows", () => {
    expect(getChargeCorrections("pending", "pay_separately")).toEqual([
      "settle",
      "waive",
    ])
    expect(getChargeCorrections("posted", "deduct_from_savings")).toEqual([
      "waive",
      "reverse",
    ])
    expect(getChargeCorrections("waived", "pay_separately")).toEqual([])
  })
})
