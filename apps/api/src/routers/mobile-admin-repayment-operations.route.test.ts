import { describe, expect, test } from "bun:test"
import { getMobileAdminRepaymentCapabilities } from "./mobile-admin-repayment-operations.route"

describe("mobile admin repayment capabilities", () => {
  test("separates financial posting from non-financial collection follow-up", () => {
    expect(getMobileAdminRepaymentCapabilities("finance_officer")).toEqual({
      followUp: true,
      post: true,
      view: true,
    })
    expect(getMobileAdminRepaymentCapabilities("operations_officer")).toEqual({
      followUp: true,
      post: false,
      view: true,
    })
    expect(getMobileAdminRepaymentCapabilities("member")).toEqual({
      followUp: false,
      post: false,
      view: false,
    })
  })
})
