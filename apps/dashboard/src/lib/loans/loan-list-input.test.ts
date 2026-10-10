import { describe, expect, test } from "bun:test"
import {
  getLoanPortfolioListInput,
  getLoanRequestListInput,
} from "./loan-list-input"

describe("loan list inputs", () => {
  test("normalizes request filters and only accepts request sorts", () => {
    expect(
      getLoanRequestListInput(
        { q: "  Amina  ", requestStatus: "under_review" },
        ["requestedAt", "desc"],
        "member-1"
      )
    ).toEqual({
      memberId: "member-1",
      q: "Amina",
      sort: ["requestedAt", "desc"],
      status: "under_review",
    })

    expect(
      getLoanRequestListInput({}, ["estimatedMonthlyServicing", "asc"]).sort
    ).toBeNull()
  })

  test("normalizes portfolio filters and only accepts portfolio sorts", () => {
    expect(
      getLoanPortfolioListInput({ portfolioStatus: "active", q: "   " }, [
        "estimatedMonthlyServicing",
        "asc",
      ])
    ).toEqual({
      memberId: undefined,
      q: undefined,
      sort: ["estimatedMonthlyServicing", "asc"],
      status: "active",
    })

    expect(
      getLoanPortfolioListInput({}, ["requestedAt", "desc"]).sort
    ).toBeNull()
  })
})
