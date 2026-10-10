import { describe, expect, test } from "bun:test"
import { getMobileAdminProjectFinancingCapabilities } from "./mobile-admin-project-financing-operations.route"

describe("mobile admin project financing capability boundary", () => {
  test("lets finance roles review, activate, and record release evidence", () => {
    expect(
      getMobileAdminProjectFinancingCapabilities("finance_officer")
    ).toEqual({
      activate: true,
      recordDisbursement: true,
      review: true,
      view: true,
    })
  })

  test("keeps operations staff read-only", () => {
    expect(
      getMobileAdminProjectFinancingCapabilities("operations_officer")
    ).toEqual({
      activate: false,
      recordDisbursement: false,
      review: false,
      view: true,
    })
  })

  test("keeps members outside the staff workspace", () => {
    expect(getMobileAdminProjectFinancingCapabilities("member")).toEqual({
      activate: false,
      recordDisbursement: false,
      review: false,
      view: false,
    })
  })
})
