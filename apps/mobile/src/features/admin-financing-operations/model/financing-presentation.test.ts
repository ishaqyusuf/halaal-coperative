import { describe, expect, test } from "bun:test"
import type {
  FinancingCycle,
  FinancingItem,
} from "./admin-financing-operations-types"
import {
  ageOf,
  cycleTargets,
  decisionAfter,
  evidenceError,
  financingChecks,
  leftToFinance,
  rowFlag,
  withCapacityBlockers,
} from "./financing-presentation"

const usage = (remainingAmount: number) => ({
  approvedAmount: 0,
  budgetAmount: 1_000_000,
  disbursedAmount: 0,
  heldAmount: 0,
  remainingAmount,
  requestedReservedAmount: 0,
})
const cycle = {
  deployableFunds: { deployableFunds: -50_000 },
  normal: usage(500_000),
  quick: usage(-10_000),
} as unknown as FinancingCycle
const request: FinancingItem = {
  actions: ["review"],
  amount: 150_000,
  approvals: [],
  blockers: [],
  evidence: ["2 of 2 guarantors approved"],
  id: "r1",
  kind: "request",
  loanId: null,
  loanType: "quick",
  member: { id: "m1", name: "Aisha Bello", number: "QHC-0042" },
  productName: "Quick financing",
  requestedAt: "2026-11-11T09:00:00.000Z",
  state: "submitted",
  termMonths: 3,
}

describe("financing presentation", () => {
  test("adds capacity blockers from the summary that lane pages skip", () => {
    expect(withCapacityBlockers(request, cycle, "NGN").blockers).toEqual([
      "The cycle allocation no longer covers this reservation.",
    ])
    const loan = { ...request, actions: ["disburse"] as FinancingItem["actions"], kind: "loan" as const, loanId: "l1" }
    expect(withCapacityBlockers(loan, cycle, "NGN").blockers).toEqual([
      "Deployable funds available for this release are ₦100,000.",
    ])
    const activity = { ...request, actions: [] }
    expect(withCapacityBlockers(activity, cycle, "NGN")).toBe(activity)
  })

  test("flags rows like the approved design", () => {
    expect(rowFlag(request, "review")).toEqual({ label: "Ready to decide", tone: "ok" })
    const once = { ...request, approvals: [{ action: "approved", actedAt: "", actorName: "Khadija Sanni", id: "a", notes: null }] }
    expect(rowFlag(once, "review").label).toBe("Needs second approval")
    expect(rowFlag({ ...request, blockers: ["1 guarantor response remains."] }, "review")).toEqual({
      label: "1 guarantor response remains.",
      tone: "warn",
    })
    expect(rowFlag(request, "activity")).toEqual({ label: "Submitted", tone: "state" })
    expect(decisionAfter("approved", request, true)).toBe("Needs one more approval")
    expect(decisionAfter("approved", once, true)).toBe("Moves to Disburse")
  })

  test("builds the checks list and cycle choices", () => {
    const checks = financingChecks({ currencyCode: "NGN", cycle, item: request, requiresDualApproval: true })
    expect(checks[0]).toEqual({ label: "Guarantors", ok: true, value: "2 of 2 approved" })
    expect(checks[4]).toMatchObject({ label: "Quick capacity", ok: false })
    expect(cycleTargets("open")).toEqual(["paused", "closed"])
    expect(cycleTargets("missing")).toEqual(["open"])
    expect(cycleTargets("closed")).toEqual([])
    expect(leftToFinance(cycle)).toBe(500_000)
    expect(evidenceError("ok")).not.toBeNull()
    expect(ageOf("2026-11-17T10:00:00.000Z", Date.parse("2026-11-17T10:40:00.000Z"))).toBe("40m")
    expect(ageOf("2026-11-14T10:00:00.000Z", Date.parse("2026-11-17T10:00:00.000Z"))).toBe("3d")
  })
})
