import { describe, expect, test } from "bun:test"
import type { MobileGuarantorRequest } from "./member-guarantor-types"
import { presentGuarantorApproval } from "./member-guarantor-presentation"

const approval = {
  id: "guarantor-1",
  loanRequest: {
    borrowerMemberNumber: "HV-1032",
    borrowerName: "Fatima Musa",
    estimatedMonthlyServicing: 37_500,
    id: "loan-1",
    loanProductName: "Education support facility",
    purpose: "Professional certification fees",
    requestedAmount: 300_000,
    requestedAt: "2026-08-09T11:00:00.000Z",
    requestedTermMonths: 8,
    status: "guarantor_review",
  },
  requestedAt: "2026-08-09T11:05:00.000Z",
  requestedByName: "Amina Bello",
  respondedAt: null,
  respondedByName: null,
  responseNotes: null,
  status: "pending",
} satisfies MobileGuarantorRequest

describe("member guarantor presentation", () => {
  test("keeps the complete decision context without shrink-only values", () => {
    const result = presentGuarantorApproval(approval, "NGN")

    expect(result.borrower).toBe("Fatima Musa")
    expect(result.borrowerContext).toContain("HV-1032")
    expect(result.requestedAmount).toContain("300,000")
    expect(result.monthlyServicing).toContain("37,500")
    expect(result.term).toBe("8 months")
    expect(result.accessibilityLabel).toContain("Pending")
  })

  test("presents a resolved response as quiet history", () => {
    const result = presentGuarantorApproval(
      {
        ...approval,
        respondedAt: "2026-08-14T08:00:00.000Z",
        responseNotes: "Repayment plan confirmed.",
        status: "approved",
      },
      "NGN"
    )

    expect(result.status).toBe("Approved")
    expect(result.respondedDate).toContain("2026")
    expect(result.resolvedContext).toBe(
      "Education support facility · NGN 300,000"
    )
    expect(result.responseNotes).toBe("Repayment plan confirmed.")
  })
})
