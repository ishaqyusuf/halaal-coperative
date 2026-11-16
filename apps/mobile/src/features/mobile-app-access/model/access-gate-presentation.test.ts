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
  // Owner rule: the app is a free companion. No price, plan, term, renewal,
  // subscription, payment, or pointer to where access is bought or turned on.
  const forbidden =
    /₦|\bNGN\b|naira|\bpay\b|payment|checkout|price|pricing|1,000|subscri|billing|\bbill\b|renew|\bterm\b|\bplan\b|upgrade|web dashboard|website|\bweb\b|dashboard/i

  test("never mentions money, subscriptions or where access is turned on", () => {
    for (const state of ACCESS_GATE_PREVIEW_STATES) {
      const p = projectAccessGate(state, "Amana Savings Cooperative")
      const text = [p.title, p.body, p.chip.label].join(" ")
      expect(text).not.toMatch(forbidden)
    }
  })

  test("access is the cooperative's decision", () => {
    for (const state of ["not_requested", "expired", "revoked"] as const) {
      expect(projectAccessGate(state, "Amana").body).toContain("Your cooperative manages who can use the HalaalVest app.")
    }
  })

  test("names the cooperative only where the member must contact it (the hero already shows it)", () => {
    const named = ACCESS_GATE_PREVIEW_STATES.filter((s) => projectAccessGate(s, "Amana Savings").body.includes("Amana Savings"))
    expect(named).toEqual(["rejected"])
  })
})

describe("dev preview", () => {
  test("only development builds accept a preview state", () => {
    expect(resolveAccessGatePreview("pending", true)).toBe("pending")
    expect(resolveAccessGatePreview("pending", false)).toBeNull()
    expect(resolveAccessGatePreview("nope", true)).toBeNull()
  })
})
