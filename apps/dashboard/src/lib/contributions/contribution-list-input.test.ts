import { describe, expect, test } from "bun:test"
import { getContributionListInput } from "./contribution-list-input"

describe("contribution ledger list input", () => {
  test("centralizes URL filters into the ledger API contract", () => {
    expect(
      getContributionListInput(
        {
          channel: "payroll",
          dateRange: ["2026-08-01", "2026-08-31"],
          memberId: "member-1",
          search: "  Amina  ",
          view: "ledger",
        },
        ["postedAt", "desc"]
      )
    ).toEqual({
      channel: "payroll",
      from: "2026-08-01",
      memberId: "member-1",
      q: "Amina",
      sort: ["postedAt", "desc"],
      to: "2026-08-31",
    })
  })

  test("drops malformed URL values before they reach the API", () => {
    expect(
      getContributionListInput(
        {
          channel: "cheque",
          dateRange: null,
          memberId: null,
          search: "   ",
          view: "ledger",
        },
        ["unknown", "up"]
      )
    ).toEqual({
      channel: undefined,
      from: undefined,
      memberId: undefined,
      q: undefined,
      sort: undefined,
      to: undefined,
    })
  })
})
