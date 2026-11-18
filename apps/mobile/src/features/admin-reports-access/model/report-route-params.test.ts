import { describe, expect, test } from "bun:test"
import { reportsLaneFromParams, reportsParamsKey } from "./report-route-params"

describe("reports route params", () => {
  test("reads the lane from lane or tab", () => {
    expect(reportsLaneFromParams({ lane: "activity" })).toBe("activity")
    expect(reportsLaneFromParams({ tab: "reports" })).toBe("reports")
    expect(reportsLaneFromParams({ lane: ["activity", "reports"] })).toBe("activity")
    expect(reportsLaneFromParams({ lane: "other" })).toBeNull()
    expect(reportsLaneFromParams({})).toBeNull()
  })

  test("keys every layout param, in a stable order", () => {
    expect(reportsParamsKey({ qaState: "offline", lane: "activity" })).toBe("lane=activity&qaState=offline")
    expect(reportsParamsKey({ lane: "activity", qaState: "offline" })).toBe(
      reportsParamsKey({ qaState: "offline", lane: "activity" })
    )
    expect(reportsParamsKey({ qaState: undefined })).toBe("")
    // A notification target opens a sheet; it doesn't change the layout.
    expect(reportsParamsKey({ notificationEntityId: "x" })).toBe("")
  })
})
