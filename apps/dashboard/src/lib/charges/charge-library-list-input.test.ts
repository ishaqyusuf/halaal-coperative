import { describe, expect, test } from "bun:test"
import {
  getChargeLibraryListInput,
  getChargeLibrarySort,
} from "./charge-library-list-input"

describe("charge library list input", () => {
  test("normalizes table columns to API sort fields", () => {
    expect(getChargeLibrarySort(["charge", "asc"])).toEqual(["name", "asc"])
    expect(getChargeLibrarySort(["status", "desc"])).toEqual([
      "isActive",
      "desc",
    ])
    expect(getChargeLibrarySort(["unknown", "asc"])).toBeNull()
  })

  test("keeps server and client filter keys identical", () => {
    expect(
      getChargeLibraryListInput(
        {
          frequency: "manual",
          q: " levy ",
          status: "active",
          valueType: "fixed_amount",
        },
        ["amount", "desc"]
      )
    ).toEqual({
      frequency: "manual",
      q: " levy ",
      sort: ["amount", "desc"],
      status: "active",
      valueType: "fixed_amount",
    })
  })
})
