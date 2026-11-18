import { describe, expect, test } from "bun:test"
import {
  countryFlag,
  formatInternationalPhone,
  movePhoneToCountry,
  normalizeInternationalPhone,
  parsePastedInternationalPhone,
  phoneCountry,
  phonePlaceholder,
} from "./international-phone"

describe("international phone", () => {
  test("normalizes national, 00-prefixed and international input to E.164", () => {
    expect(normalizeInternationalPhone("0803 123 4567", "NG")).toBe(
      "+2348031234567"
    )
    expect(normalizeInternationalPhone("0044 7400 123456", "GB")).toBe(
      "+447400123456"
    )
    expect(normalizeInternationalPhone("+233 24 123 4567", "GH")).toBe(
      "+233241234567"
    )
  })

  test("rejects invalid numbers, extensions and mismatched countries", () => {
    expect(normalizeInternationalPhone("123", "NG")).toBeNull()
    expect(normalizeInternationalPhone("+447400123456", "NG")).toBeNull()
    expect(normalizeInternationalPhone("+14165550123", "US")).toBeNull()
    expect(normalizeInternationalPhone("+12133734253 ext 3", "US")).toBeNull()
    expect(normalizeInternationalPhone("08031234567", "XX")).toBeNull()
    expect(phoneCountry("XX")).toBeUndefined()
    expect(phoneCountry("ng")).toBe("NG")
  })

  test("keeps the typed digits when the phone's country changes", () => {
    expect(movePhoneToCountry("+2348031234567", "NG", "GH")).toBe(
      "+2338031234567"
    )
    expect(movePhoneToCountry("", "NG", "GH")).toBe("")
  })

  test("detects the country of a pasted international number", () => {
    expect(parsePastedInternationalPhone("+44 7400 123456")).toEqual({
      country: "GB",
      number: "+447400123456",
    })
    expect(parsePastedInternationalPhone("0803 123 4567")).toBeNull()
  })

  test("formats, flags and placeholders", () => {
    expect(formatInternationalPhone("+2348031234567")).toBe("+234 803 123 4567")
    expect(countryFlag("NG")).toBe("🇳🇬")
    expect(phonePlaceholder("NG")).toBe("000 000 0000")
    expect(phonePlaceholder(undefined)).toBe("Phone number")
  })
})
