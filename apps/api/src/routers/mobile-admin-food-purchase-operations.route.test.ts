import { describe, expect, test } from "bun:test"
import { getMobileAdminFoodPurchaseCapabilities } from "./mobile-admin-food-purchase-operations.route"

describe("mobile admin Foodstuff Purchase capability policy", () => {
  test("keeps finance and committee responsibilities explicit", () => {
    expect(getMobileAdminFoodPurchaseCapabilities("finance_officer")).toEqual({
      releaseFunds: true,
      reviewAccounting: true,
      reviewApplications: true,
      submitAccounting: true,
      view: true,
    })
    expect(
      getMobileAdminFoodPurchaseCapabilities("operations_officer")
    ).toEqual({
      releaseFunds: false,
      reviewAccounting: false,
      reviewApplications: true,
      submitAccounting: true,
      view: true,
    })
    expect(getMobileAdminFoodPurchaseCapabilities("member")).toEqual({
      releaseFunds: false,
      reviewAccounting: false,
      reviewApplications: false,
      submitAccounting: false,
      view: false,
    })
  })
})
