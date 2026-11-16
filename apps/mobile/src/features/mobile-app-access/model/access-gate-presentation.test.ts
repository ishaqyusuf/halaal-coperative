import { describe, expect, test } from "bun:test"
import {
  ACCESS_GATE_PREVIEW_STATES,
  projectAccessGate,
  resolveAccessGatePreview,
  resolveAccessGateState,
} from "./access-gate-presentation"

describe("access gate state", () => {
  test("checking only while there is no status yet", () => {
    expect(resolveAccessGateState({ checking: true, error: false, role: "member", status: null })).toBe("checking")
    expect(resolveAccessGateState({ checking: true, error: false, role: "member", status: "pending" })).toBe("pending")
  })

  test("a failed check never guesses a status", () => {
    expect(resolveAccessGateState({ checking: false, error: true, role: "member", status: null })).toBe("error")
    expect(resolveAccessGateState({ checking: false, error: false, role: "member", status: null })).toBe("error")
  })

  test("members see their term status", () => {
    for (const status of ["pending", "not_requested", "expired", "revoked", "rejected"] as const) {
      expect(resolveAccessGateState({ checking: false, error: false, role: "member", status })).toBe(status)
    }
  })

  test("refused staff mean the cooperative's app is off", () => {
    expect(resolveAccessGateState({ checking: false, error: false, role: "admin", status: "not_requested" })).toBe("staff_off")
  })
})

describe("access gate copy", () => {
  test("never shows a price, currency or payment link", () => {
    for (const state of ACCESS_GATE_PREVIEW_STATES) {
      const p = projectAccessGate(state, "Amana Savings Cooperative")
      const text = [p.title, p.body, p.chip.label, p.web?.title, p.web?.path].join(" ")
      expect(text).not.toMatch(/₦|NGN|naira|\bpay\b|payment|checkout|price|1,000/i)
    }
  })

  test("the web path is offered where the member or an owner can act", () => {
    const withWeb = ACCESS_GATE_PREVIEW_STATES.filter((s) => projectAccessGate(s, "C").web)
    expect(withWeb).toEqual(["not_requested", "expired", "revoked", "rejected", "staff_off"])
  })

  test("names the cooperative", () => {
    expect(projectAccessGate("rejected", "Amana").body).toContain("Amana")
  })
})

describe("dev preview", () => {
  test("only development builds accept a preview state", () => {
    expect(resolveAccessGatePreview("pending", true)).toBe("pending")
    expect(resolveAccessGatePreview("pending", false)).toBeNull()
    expect(resolveAccessGatePreview("nope", true)).toBeNull()
  })
})
