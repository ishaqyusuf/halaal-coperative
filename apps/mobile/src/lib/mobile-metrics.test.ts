import { describe, expect, test } from "bun:test"
import {
  formatMobileActivityDetail,
  formatMobileRecordDetail,
  formatMobileStatementDetail,
} from "./mobile-metrics"

describe("formatMobileRecordDetail", () => {
  test("shortens UUID segments without removing the surrounding reference", () => {
    expect(
      formatMobileRecordDetail(
        "Ref opening-balance:b17400d5-99ab-4ca9-976b-8cf54c6645f2:savings"
      )
    ).toBe("Ref opening-balance:b17400d5…:savings")
  })

  test("does not change ordinary member-facing references", () => {
    expect(formatMobileRecordDetail("Ref RCPT-2026-0042")).toBe(
      "Ref RCPT-2026-0042"
    )
  })
})

describe("formatMobileActivityDetail", () => {
  test("keeps member-facing context without internal references or ledger prose", () => {
    expect(
      formatMobileActivityDetail(
        "Posted Aug 30, 2026 - Ref charge-correction:e7e1792f-58af-4e70-bf45-6f3c6d2bcf01 - 2 ledger entries",
        "charge"
      )
    ).toBe("Aug 30, 2026 · Charge")
  })

  test("does not expose ordinary references in compact activity rows", () => {
    expect(
      formatMobileActivityDetail(
        "Posted Aug 30, 2026 - Ref RCPT-2026-0042 - 1 ledger entry",
        "receipt"
      )
    ).toBe("Aug 30, 2026 · Receipt")
  })

  test("supports activity without a reference or status", () => {
    expect(
      formatMobileActivityDetail(
        "Posted Jul 27, 2026 - 1 ledger entry"
      )
    ).toBe("Jul 27, 2026")
  })

  test("keeps contribution context concise without duplicating posted status", () => {
    expect(
      formatMobileActivityDetail(
        "Payroll - Posted Aug 28, 2026 - Ref PAY-42 - Special savings 5000",
        "Posted"
      )
    ).toBe("Payroll · Aug 28, 2026 · Includes special savings")
  })
})

describe("formatMobileStatementDetail", () => {
  test("removes internal ledger references and duplicate posting prose", () => {
    expect(
      formatMobileStatementDetail(
        "Posted Aug 30, 2026 - Ref charge-correction:e7e1792f-58af-4e70-bf45-6f3c6d2bcf01 - 2 ledger entries"
      )
    ).toBe("Aug 30, 2026")
  })

  test("keeps useful context while replacing separator-heavy copy", () => {
    expect(
      formatMobileStatementDetail(
        "Transfer - Posted Jul 27, 2026 - Ref QA-FATIMA-JUL-2026"
      )
    ).toBe("Transfer · Jul 27, 2026")
  })

  test("humanizes share request and opening-position details", () => {
    expect(
      formatMobileStatementDetail(
        "2 requested unit(s) - Requested Aug 21, 2026"
      )
    ).toBe("2 units · Aug 21, 2026")
    expect(
      formatMobileStatementDetail("Backfill - Effective Jul 31, 2026")
    ).toBe("Established Jul 31, 2026")
  })

  test("removes duplicated charge collection instructions", () => {
    expect(
      formatMobileStatementDetail(
        "Financing request - Assessed Aug 30, 2026 - Deduct From Savings"
      )
    ).toBe("Financing request · Aug 30, 2026")
  })
})
