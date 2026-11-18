import { describe, expect, it } from "bun:test"
import {
  closingMoneyLines,
  summarizeClosingPosition,
  type MemberClosingPosition,
} from "./account-closing-position"

const zero = {
  totalSavingsSnapshot: 0,
  specialSavingsBalance: 0,
  shareCapitalBalance: 0,
  totalOutstandingPrincipal: 0,
  approvedNotPaidOutAmount: 0,
  procurementOutstanding: 0,
  foodPurchaseOutstanding: 0,
}

function member(
  lines: ReturnType<typeof closingMoneyLines>,
  exited = false
): MemberClosingPosition {
  return {
    memberId: "member-a",
    tenantId: "tenant-a",
    tenantName: "Ilorin Teachers Cooperative",
    memberNumber: "ITC-014",
    status: exited ? "exited" : "active",
    exitedAt: exited ? new Date() : null,
    exited,
    lines,
    settled: exited || lines.every((line) => !line.outstanding),
  }
}

describe("close-account money position", () => {
  it("lists every money line and marks none outstanding at zero", () => {
    const lines = closingMoneyLines(zero, 0)
    expect(lines.map((line) => line.kind)).toEqual([
      "savings",
      "special_savings",
      "shares",
      "loans_owed",
      "loans_approved_not_paid_out",
      "purchases_owed",
      "guarantees",
    ])
    expect(lines.some((line) => line.outstanding)).toBe(false)
    expect(summarizeClosingPosition([member(lines)])).toMatchObject({
      canCloseLogin: true,
      outstandingSummary: null,
    })
  })

  it("treats money held, money owed and guarantees as outstanding", () => {
    const lines = closingMoneyLines(
      {
        ...zero,
        totalSavingsSnapshot: 12500.5,
        totalOutstandingPrincipal: 40000,
        procurementOutstanding: 1000,
        foodPurchaseOutstanding: 500,
      },
      2
    )
    expect(
      lines.filter((line) => line.outstanding).map((line) => line.kind)
    ).toEqual(["savings", "loans_owed", "purchases_owed", "guarantees"])
    expect(lines.find((line) => line.kind === "purchases_owed")?.amount).toBe(
      1500
    )
    const position = summarizeClosingPosition([member(lines)])
    expect(position.canCloseLogin).toBe(false)
    expect(position.outstandingSummary).toBe(
      "Ilorin Teachers Cooperative (member ITC-014): savings ₦12,500.50, loans still owed ₦40,000.00, procurement and foodstuff still owed ₦1,500.00, 2 active guarantees on someone else's loan"
    )
  })

  it("flags a negative balance so the cooperative corrects it first", () => {
    const lines = closingMoneyLines({ ...zero, shareCapitalBalance: -10 }, 0)
    expect(lines.find((line) => line.kind === "shares")?.outstanding).toBe(true)
  })

  it("lets the login close once the cooperative has marked the member exited", () => {
    const lines = closingMoneyLines({ ...zero, totalSavingsSnapshot: 900 }, 0)
    expect(summarizeClosingPosition([member(lines, true)]).canCloseLogin).toBe(
      true
    )
  })

  it("reads a login with no member record as nothing to settle", () => {
    expect(summarizeClosingPosition([])).toEqual({
      members: [],
      canCloseLogin: true,
      outstandingSummary: null,
    })
    expect(
      closingMoneyLines(null, 0).every((line) => !line.outstanding)
    ).toBe(true)
  })
})
