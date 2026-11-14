import { describe, expect, test } from "bun:test"
import {
  getRequestNextStep,
  getRequestState,
  getRequestStatusFilterOptions,
  getRequestSteps,
  monthlyAmount,
  readableReference,
} from "./request-status-words"

describe("request status words", () => {
  test("uses one plain word per status across the three request pages", () => {
    expect(
      getRequestState({ kind: "procurement", status: "submitted" })
    ).toEqual({ label: "Waiting", step: 0, tone: "warning" })
    expect(
      getRequestState({ kind: "projectFinancing", status: "under_review" })
        .label
    ).toBe("Being checked")
    expect(
      getRequestState({ kind: "foodPurchase", status: "rejected" })
    ).toMatchObject({ label: "Declined", step: -1 })
    expect(
      getRequestState({ kind: "procurement", status: "active" }).label
    ).toBe("Repaying")
  })

  test("project financing that is not paid back reads Paid out, with no Paid off step", () => {
    const input = {
      kind: "projectFinancing" as const,
      repayable: false,
      status: "active",
    }

    expect(getRequestState(input).label).toBe("Paid out")
    expect(getRequestSteps("projectFinancing", false)).not.toContain("Paid off")
    expect(getRequestNextStep(input)).toBe("The money has been paid out.")
  })

  test("food purchase reads Repaying or Paid off from what was paid", () => {
    const approved = { approvedAmount: 50_000, kind: "foodPurchase" as const }

    expect(
      getRequestState({ ...approved, paidAmount: 0, status: "approved" }).label
    ).toBe("Approved")
    expect(
      getRequestState({ ...approved, paidAmount: 25_000, status: "approved" })
        .label
    ).toBe("Repaying")
    expect(
      getRequestState({ ...approved, paidAmount: 50_000, status: "approved" })
        .label
    ).toBe("Paid off")
  })

  test("filters list plain labels for stored statuses", () => {
    const options = getRequestStatusFilterOptions("procurement")

    expect(options.find((option) => option.value === "submitted")?.label).toBe(
      "Waiting"
    )
    expect(options.map((option) => option.value)).toContain("purchased")
    expect(
      getRequestStatusFilterOptions("foodPurchase").map(
        (option) => option.value
      )
    ).not.toContain("active")
  })

  test("works out a monthly amount only for whole months", () => {
    expect(monthlyAmount(120_000, 4)).toBe(30_000)
    expect(monthlyAmount(100_000, 3)).toBe(33_333.33)
    expect(monthlyAmount(100_000, 0)).toBeNull()
    expect(monthlyAmount(100_000, 1.5)).toBeNull()
  })

  test("hides system keys from people", () => {
    expect(readableReference("opening-balance:abc:procurement")).toBeNull()
    expect(readableReference("PO-123")).toBe("PO-123")
  })
})
