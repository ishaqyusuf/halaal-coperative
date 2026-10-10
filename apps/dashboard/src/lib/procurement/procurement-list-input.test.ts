import { describe, expect, test } from "bun:test"
import {
  getProcurementListInput,
  getProcurementSort,
} from "./procurement-list-input"

describe("procurement list input", () => {
  test("normalizes supported URL controls", () => {
    expect(
      getProcurementListInput(
        { q: "  generator ", status: "under_review" },
        ["requested", "desc"]
      )
    ).toEqual({
      q: "  generator ",
      sort: ["requestedCost", "desc"],
      status: "under_review",
    })
  })

  test("drops unsupported filters and derived schedule sorting", () => {
    expect(getProcurementSort(["schedule", "desc"])).toBeNull()
    expect(getProcurementSort(["status", "asc"])).toBeNull()
    expect(
      getProcurementListInput(
        { q: null, status: "not-a-status" },
        ["schedule", "desc"]
      )
    ).toEqual({ q: undefined, sort: null, status: undefined })
  })
})
