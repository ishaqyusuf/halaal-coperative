import { describe, expect, test } from "bun:test"
import {
  currencySymbol,
  formatCompactMoney,
  formatMoney,
  formatMoneyInput,
  groupDigits,
  parseMoneyInput,
} from "./money"

describe("money display", () => {
  test("groups whole naira with the ₦ symbol", () => {
    expect(formatMoney(25000)).toBe("₦25,000")
    expect(formatMoney(1245000)).toBe("₦1,245,000")
    expect(formatMoney(0)).toBe("₦0")
    expect(formatMoney(999)).toBe("₦999")
  })

  test("rounds to whole naira unless kobo are requested", () => {
    expect(formatMoney(1250.5)).toBe("₦1,251")
    expect(formatMoney(1250.5, { fractionDigits: 2 })).toBe("₦1,250.50")
  })

  test("signs negatives and optional positives", () => {
    expect(formatMoney(-5000)).toBe("-₦5,000")
    expect(formatMoney(5000, { signDisplay: "always" })).toBe("+₦5,000")
    expect(formatMoney(0, { signDisplay: "always" })).toBe("₦0")
  })

  test("never throws on non-finite input", () => {
    expect(formatMoney(Number.NaN)).toBe("₦0")
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe("₦0")
  })

  test("uses symbols for known currencies and the code otherwise", () => {
    expect(currencySymbol()).toBe("₦")
    expect(currencySymbol("usd")).toBe("$")
    expect(currencySymbol("KES")).toBe("KES ")
    expect(formatMoney(1200, { currencyCode: "USD" })).toBe("$1,200")
  })

  test("compacts large amounts", () => {
    expect(formatCompactMoney(950)).toBe("₦950")
    expect(formatCompactMoney(85_000)).toBe("₦85k")
    expect(formatCompactMoney(9_583_333)).toBe("₦9.58m")
    expect(formatCompactMoney(1_250_000)).toBe("₦1.25m")
    expect(formatCompactMoney(-2_000_000)).toBe("-₦2m")
  })

  test("groupDigits drops leading zeros", () => {
    expect(groupDigits("0001234")).toBe("1,234")
    expect(groupDigits("0")).toBe("0")
  })
})

describe("money input", () => {
  test("groups typed digits and keeps a canonical raw value", () => {
    expect(parseMoneyInput("25000")).toEqual({
      display: "25,000",
      raw: "25000",
      value: 25000,
    })
    expect(parseMoneyInput("₦ 1,250,000")).toEqual({
      display: "1,250,000",
      raw: "1250000",
      value: 1250000,
    })
  })

  test("empty and junk input clear the value", () => {
    expect(parseMoneyInput("")).toEqual({ display: "", raw: "", value: null })
    expect(parseMoneyInput("abc")).toEqual({ display: "", raw: "", value: null })
  })

  test("whole naira by default; decimals only when allowed", () => {
    expect(parseMoneyInput("12.50").raw).toBe("1250")
    expect(parseMoneyInput("1250.", { allowDecimals: true }).display).toBe("1,250.")
    expect(parseMoneyInput("1250.567", { allowDecimals: true }).raw).toBe("1250.56")
    expect(parseMoneyInput(".5", { allowDecimals: true }).raw).toBe("0.5")
    expect(parseMoneyInput("1.2.3", { allowDecimals: true }).raw).toBe("1.23")
  })

  test("caps runaway pastes", () => {
    expect(parseMoneyInput("9".repeat(20)).raw).toHaveLength(13)
  })

  test("formats a stored raw value for a controlled field", () => {
    expect(formatMoneyInput("1000000")).toBe("1,000,000")
    expect(formatMoneyInput("")).toBe("")
  })
})
