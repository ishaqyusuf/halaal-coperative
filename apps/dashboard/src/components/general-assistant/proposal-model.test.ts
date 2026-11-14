import { describe, expect, test } from "bun:test"
import type { AssistantProposalFields } from "@halaalvest/assistant/contracts"
import {
  parseNaira,
  proposalFieldsFromForm,
  proposalFormValues,
  proposalLines,
} from "./proposal-model"

const receipt: AssistantProposalFields = {
  kind: "receipt-submission",
  amount: { amount: "25000.00", currency: "NGN" },
  paidOn: "2026-11-12",
  paymentReference: "TRF-1",
  allocations: [
    {
      targetId: "regular_savings",
      label: "Regular savings",
      amount: { amount: "25000.00", currency: "NGN" },
    },
  ],
  evidenceUploadId: null,
}

describe("parseNaira", () => {
  test("accepts typed naira and rejects nonsense", () => {
    expect(parseNaira("₦25,000")).toBe("25000")
    expect(parseNaira("25000.5")).toBe("25000.5")
    expect(parseNaira("")).toBeNull()
    expect(parseNaira("0")).toBe("invalid")
    expect(parseNaira("25.555")).toBe("invalid")
    expect(parseNaira("abc")).toBe("invalid")
  })
})

describe("proposalFieldsFromForm", () => {
  test("keeps the server-chosen allocation and evidence on a receipt edit", () => {
    const values = { ...proposalFormValues(receipt), amount: "30,000" }
    const parsed = proposalFieldsFromForm(receipt, values)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.fields).toEqual({
      ...receipt,
      amount: { amount: "30000", currency: "NGN" },
    })
  })

  test("reports invalid amount, date and month", () => {
    const parsed = proposalFieldsFromForm(
      {
        kind: "record-payment",
        member: null,
        amount: null,
        paidOn: null,
        period: null,
        channel: null,
        paymentReference: null,
        allocations: [],
      },
      {
        ...proposalFormValues(receipt),
        amount: "-5",
        paidOn: "12/11/2026",
        period: "Nov",
      }
    )
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(Object.keys(parsed.errors).sort()).toEqual([
      "amount",
      "paidOn",
      "period",
    ])
  })

  test("only accepts a registered payment-request purpose", () => {
    const request: AssistantProposalFields = {
      kind: "payment-request",
      purpose: null,
      amount: null,
      note: null,
    }
    const bad = proposalFieldsFromForm(request, {
      ...proposalFormValues(request),
      purpose: "anything",
    })
    expect(bad.ok).toBe(false)
    const good = proposalFieldsFromForm(request, {
      ...proposalFormValues(request),
      purpose: "pay_in",
      amount: "5000",
    })
    expect(good.ok && good.fields).toEqual({
      kind: "payment-request",
      purpose: "pay_in",
      amount: { amount: "5000", currency: "NGN" },
      note: null,
    })
  })
})

describe("proposalLines", () => {
  test("shows the exact amount and each allocation", () => {
    const lines = proposalLines(receipt)
    expect(lines[0]).toEqual({ label: "Amount", value: "₦25,000", strong: true })
    expect(lines.map((line) => line.label)).toContain("→ Regular savings")
  })
})
