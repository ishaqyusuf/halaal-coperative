import { describe, expect, test } from "bun:test"
import {
  getFoodPurchaseListInput,
  getFoodPurchaseSort,
} from "./food-purchase-list-input"

describe("food purchase list input", () => {
  test("normalizes URL filters and table aliases into the tRPC list contract", () => {
    expect(
      getFoodPurchaseListInput({ q: "  Rice  ", status: "under_review" }, [
        "application",
        "asc",
      ])
    ).toEqual({
      q: "  Rice  ",
      sort: ["memberName", "asc"],
      status: "under_review",
    })
  })

  test("drops invalid URL states", () => {
    expect(
      getFoodPurchaseListInput({ q: null, status: "unknown" }, [
        "amount",
        "sideways",
      ])
    ).toEqual({ q: undefined, sort: null, status: undefined })
    expect(getFoodPurchaseSort(["payment", "desc"])).toEqual([
      "paidAmount",
      "desc",
    ])
  })
})
