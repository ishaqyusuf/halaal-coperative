import { describe, expect, test } from "bun:test"
import {
  getProjectFinancingListInput,
  getProjectFinancingSort,
} from "./project-financing-list-input"

describe("project financing list input", () => {
  test("normalizes supported URL controls", () => {
    expect(
      getProjectFinancingListInput(
        { q: "  cassava ", status: "under_review" },
        ["requested", "desc"]
      )
    ).toEqual({
      q: "  cassava ",
      sort: ["requestedAmount", "desc"],
      status: "under_review",
    })
  })

  test("drops unsupported filters and status sorting", () => {
    expect(getProjectFinancingSort(["status", "asc"])).toBeNull()
    expect(getProjectFinancingSort(["unknown", "desc"])).toBeNull()
    expect(
      getProjectFinancingListInput(
        { q: null, status: "not-a-status" },
        ["status", "asc"]
      )
    ).toEqual({ q: undefined, sort: null, status: undefined })
  })
})
