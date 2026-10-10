import { describe, expect, test } from "bun:test"
import {
  getShareApplicationListInput,
  getShareApplicationSort,
} from "./share-application-list-input"

describe("share application list input", () => {
  test("normalizes URL filters and legacy column aliases", () => {
    expect(
      getShareApplicationListInput({
        filter: {
          shareApplicationQ: "  Aisha  ",
          shareApplicationStatus: "pending",
        },
        sort: ["units", "desc"],
      })
    ).toEqual({
      q: "Aisha",
      sort: ["requestedUnits", "desc"],
      status: "pending",
    })
  })

  test("uses deferred search while dropping unsupported URL values", () => {
    expect(
      getShareApplicationListInput({
        filter: {
          shareApplicationQ: "Aisha",
          shareApplicationStatus: "unknown",
        },
        search: "  Bala  ",
        sort: ["unknown", "down"],
      })
    ).toEqual({
      q: "Bala",
      sort: null,
      status: undefined,
    })
    expect(getShareApplicationSort(["requestedAt", "asc"])).toEqual([
      "createdAt",
      "asc",
    ])
  })
})
