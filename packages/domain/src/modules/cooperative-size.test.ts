import { describe, expect, test } from "bun:test"
import {
  cooperativeSizeRanges,
  formatCooperativeSizeRangeLabel,
  parseCooperativeSizeRangeValue,
} from "./cooperative-size"

describe("cooperative size ranges", () => {
  test("parses only configured persisted range values", () => {
    for (const range of cooperativeSizeRanges) {
      expect(parseCooperativeSizeRangeValue(String(range.value))).toBe(
        range.value
      )
    }

    expect(parseCooperativeSizeRangeValue("")).toBeNull()
    expect(parseCooperativeSizeRangeValue("large")).toBeNull()
    expect(parseCooperativeSizeRangeValue("120")).toBeNull()
    expect(parseCooperativeSizeRangeValue("9999")).toBeNull()
  })

  test("formats existing exact sizes into range labels", () => {
    expect(formatCooperativeSizeRangeLabel(120, "Not captured")).toBe(
      "101-250 members"
    )
    expect(formatCooperativeSizeRangeLabel(428, "Not captured")).toBe(
      "251-500 members"
    )
    expect(formatCooperativeSizeRangeLabel(null, "Not captured")).toBe(
      "Not captured"
    )
  })

  test("formats persisted option values into selected range labels", () => {
    for (const range of cooperativeSizeRanges) {
      expect(formatCooperativeSizeRangeLabel(range.value, "Not captured")).toBe(
        range.label
      )
    }
  })
})
