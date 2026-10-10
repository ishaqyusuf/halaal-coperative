import { describe, expect, test } from "bun:test"
import { getMobileAdminShareProfitCapabilities } from "./mobile-admin-share-profit-governance.route"

describe("mobile admin share and profit governance capabilities", () => {
  test("lets finance roles view and perform governed commands", () => {
    expect(getMobileAdminShareProfitCapabilities("finance_officer")).toEqual({
      approveProfit: true,
      publishProfit: true,
      reviewShares: true,
      view: true,
    })
  })

  test("keeps operations staff read-only", () => {
    expect(getMobileAdminShareProfitCapabilities("operations_officer")).toEqual({
      approveProfit: false,
      publishProfit: false,
      reviewShares: false,
      view: true,
    })
  })

  test("keeps members outside the staff workspace", () => {
    expect(getMobileAdminShareProfitCapabilities("member")).toEqual({
      approveProfit: false,
      publishProfit: false,
      reviewShares: false,
      view: false,
    })
  })
})
