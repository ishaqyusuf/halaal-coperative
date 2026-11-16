import { describe, expect, test } from "bun:test"
import {
  describeLoansExportDates,
  LOANS_EXPORT_HEADERS,
  toLoansExportCsvRow,
} from "./loans-export"

describe("loans export (triage 0.8)", () => {
  test("the line above the header says which date each row uses", () => {
    expect(
      describeLoansExportDates({
        fromDate: new Date("2026-11-01T00:00:00.000Z"),
        toDate: new Date("2026-11-30T23:59:59.999Z"),
      })
    ).toBe(
      "Loans are listed by the date they were paid out. Requests not yet paid out are listed by the date they were asked for. Dates from 2026-11-01 to 2026-11-30."
    )
    expect(describeLoansExportDates({})).toEndWith(" All dates.")
  })

  test("each row names the date it was filtered by", () => {
    const row = toLoansExportCsvRow({
      cursor: "1|2026-11-05T10:00:00.000Z|loan-1",
      dateUsed: new Date("2026-11-05T10:00:00.000Z"),
      dateUsedLabel: "Paid out",
      estimatedMonthlyServicing: 5000,
      extraMonthlySavingsAmount: 0,
      id: "loan-1",
      loanTermMonths: 8,
      memberName: "Fatima Lawal",
      memberNumber: "M-001",
      outstandingPrincipal: 40000,
      paidOutAt: new Date("2026-11-05T10:00:00.000Z"),
      principalAmount: 40000,
      productCode: "QF",
      productName: "Quick financing",
      recordType: "loan",
      requestedAmount: null,
      requestedAt: new Date("2026-10-20T08:00:00.000Z"),
      requestedTermMonths: null,
      status: "disbursed",
    })

    expect(row).toHaveLength(LOANS_EXPORT_HEADERS.length)
    const cell = (header: string) => row[LOANS_EXPORT_HEADERS.indexOf(header)]
    expect(cell("Date Used")).toBe("Paid out")
    expect(cell("Date")).toBe("2026-11-05T10:00:00.000Z")
    expect(cell("Asked For On")).toBe("2026-10-20T08:00:00.000Z")
    expect(cell("Requested Amount")).toBe("")
  })
})
