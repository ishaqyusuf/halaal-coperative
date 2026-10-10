import { describe, expect, test } from "bun:test"
import { getMobileAdminFinancingCapabilities } from "./mobile-admin-financing-operations.route"

describe("mobile admin financing operations capability boundary", () => {
  test("lets finance roles control cycles, review, and disburse", () => {
    expect(getMobileAdminFinancingCapabilities("finance_officer")).toEqual({
      disburse: true,
      manageCycle: true,
      review: true,
      view: true,
    })
  })

  test("keeps operations staff read-only", () => {
    expect(getMobileAdminFinancingCapabilities("operations_officer")).toEqual({
      disburse: false,
      manageCycle: false,
      review: false,
      view: true,
    })
  })

  test("keeps members outside the staff workspace", () => {
    expect(getMobileAdminFinancingCapabilities("member")).toEqual({
      disburse: false,
      manageCycle: false,
      review: false,
      view: false,
    })
  })
})
