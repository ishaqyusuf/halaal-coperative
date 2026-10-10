import { describe, expect, test } from "bun:test"
import type { AdminReports } from "./admin-reports-access-types"
import { presentAdminReportsForQa } from "./admin-reports-qa"

const reports = {
  activityEvents: [{ id: "activity-1" }],
  collectionFollowUps: [{ id: "follow-up-1" }],
  generatedAt: "2026-08-31T10:00:00.000Z",
  reports: [{ key: "members" }],
  stats: [{ key: "members", value: 12 }],
} as AdminReports

describe("presentAdminReportsForQa", () => {
  test("keeps bounded summaries while emptying all record collections", () => {
    const result = presentAdminReportsForQa(reports, "empty")

    expect(result.reports).toEqual([])
    expect(result.activityEvents).toEqual([])
    expect(result.collectionFollowUps).toEqual([])
    expect(result.stats[0]?.value).toBe(0)
  })

  test("marks offline evidence stale without changing report records", () => {
    const result = presentAdminReportsForQa(reports, "offline")

    expect(result.cache?.status).toBe("stale")
    expect(result.cache?.reason).toBe("offline")
    expect(result.reports).toHaveLength(1)
  })

  test("distinguishes an outdated snapshot from an offline snapshot", () => {
    expect(presentAdminReportsForQa(reports, "stale").cache?.reason).toBe(
      "stale"
    )
  })
})
