import { describe, expect, test } from "bun:test"
import {
  composeCooperativeAccessCode,
  cooperativeMemberNumberPrefix,
  isValidCooperativeCodePrefix,
  normalizeCooperativeAccessCode,
} from "./cooperative-access-code"

describe("cooperative access codes", () => {
  test("requires a three-to-five letter cooperative prefix", () => {
    expect(isValidCooperativeCodePrefix("AMN")).toBe(true)
    expect(isValidCooperativeCodePrefix("trust")).toBe(true)
    expect(isValidCooperativeCodePrefix("AB")).toBe(false)
    expect(isValidCooperativeCodePrefix("AMN1")).toBe(false)
  })

  test("builds one normalized member access code without duplicating the prefix", () => {
    expect(composeCooperativeAccessCode("amn", "0042")).toBe("AMN-0042")
    expect(composeCooperativeAccessCode("AMN", "AMN-0042")).toBe("AMN-0042")
    expect(cooperativeMemberNumberPrefix("amn")).toBe("AMN-")
  })

  test("normalizes pasted access codes", () => {
    expect(normalizeCooperativeAccessCode(" amn / 0042 ")).toBe("AMN-0042")
  })
})
