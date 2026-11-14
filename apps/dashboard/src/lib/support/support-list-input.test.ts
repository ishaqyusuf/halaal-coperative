import { describe, expect, test } from "bun:test"
import { getSupportListInput } from "./support-list-input"

const filters = {
  assignedToUserId: "11111111-1111-4111-8111-111111111111",
  category: "payment_issue",
  priority: "urgent",
  q: "receipt",
  status: "open",
}

describe("support list input", () => {
  test("builds the shared staff list contract", () => {
    expect(
      getSupportListInput(filters, ["assignee", "asc"], undefined, true)
    ).toEqual({
      assignedToUserId: "11111111-1111-4111-8111-111111111111",
      category: "payment_issue",
      priority: "urgent",
      q: "receipt",
      sort: ["assignedToUser", "asc"],
      status: "open",
      statusGroup: undefined,
    })
  })

  test("drops staff-only and malformed URL filters for member queries", () => {
    expect(
      getSupportListInput(
        {
          ...filters,
          assignedToUserId: "not-a-uuid",
          category: "not-a-category",
        },
        ["unknown", "down"],
        "member issue",
        false
      )
    ).toEqual({
      assignedToUserId: undefined,
      category: undefined,
      priority: "urgent",
      q: "member issue",
      sort: null,
      status: "open",
      statusGroup: undefined,
    })
  })

  test("reads the Open and Solved-or-closed choices as status groups", () => {
    expect(
      getSupportListInput({ ...filters, status: "active" }, null, undefined, false)
    ).toMatchObject({ status: undefined, statusGroup: "active" })
    expect(
      getSupportListInput({ ...filters, status: "finished" }, null)
    ).toMatchObject({ status: undefined, statusGroup: "finished" })
  })
})
