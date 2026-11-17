import { describe, expect, test } from "bun:test"
import type { AdminActivityEvent, AdminReportCard } from "./admin-reports-access-types"
import { createPendingReportFile } from "./generated-report-file"
import {
  actionTone,
  activeFilterCount,
  activityRows,
  countdownText,
  dayLabel,
  fileSubtitle,
  groupReports,
  matchQuickRange,
  quickRange,
  rangeText,
  recordLine,
} from "./report-presentation"

const now = new Date(2026, 10, 17, 9, 41)
const event = (id: string, occurredAt: Date) =>
  ({
    action: "member.created",
    entityId: "3f2a91c0-aaaa",
    entityLabel: "Member",
    entityType: "Member",
    id,
    occurredAt: occurredAt.toISOString(),
  }) as AdminActivityEvent

describe("reports presentation", () => {
  test("groups report cards in the approved category order", () => {
    const cards = [
      { category: "governance", key: "audit" },
      { category: "members", key: "members" },
    ] as AdminReportCard[]
    expect(groupReports(cards).map((group) => group.label)).toEqual(["Members", "Governance"])
  })

  test("builds quick ranges and recognises them", () => {
    expect(quickRange("month", now)).toEqual({ fromDate: "2026-11-01", toDate: "2026-11-17" })
    expect(quickRange("last", now)).toEqual({ fromDate: "2026-10-01", toDate: "2026-10-31" })
    expect(matchQuickRange({ fromDate: "2026-01-01", toDate: "2026-11-17" }, now)).toBe("year")
    expect(matchQuickRange({ fromDate: null, toDate: null }, now)).toBe("all")
    expect(rangeText({ fromDate: null, toDate: null })).toBe("All records")
    expect(rangeText({ fromDate: "2026-11-01", toDate: null })).toBe("1 Nov 2026 – Today")
  })

  test("counts down and words file states", () => {
    const expiresAt = new Date(now.getTime() + 14 * 60_000 + 32_000).toISOString()
    expect(countdownText(expiresAt, now.getTime())).toBe("14:32")
    const pending = createPendingReportFile({ id: "f1", reportKey: "members", reportTitle: "Member register" })
    expect(fileSubtitle(pending)).toBe("Generating…")
    expect(fileSubtitle({ ...pending, expiresAt, rowCount: 412, status: "ready" }, now.getTime())).toBe(
      "412 rows · 14:32 left"
    )
  })

  test("labels days and joins each day's events into one card", () => {
    const rows = activityRows(
      [event("a", now), event("b", now), event("c", new Date(2026, 10, 16, 18))],
      now
    )
    expect(rows.map((row) => (row.kind === "day" ? `${row.label}:${row.count}` : row.position))).toEqual([
      "Today:2",
      "first",
      "last",
      "Yesterday:1",
      "only",
    ])
    expect(dayLabel(new Date(2026, 9, 3).toISOString(), now)).toBe("3 Oct 2026")
  })

  test("colours actions and counts filters", () => {
    expect(actionTone("member_share_application.approved")).toBe("success")
    expect(actionTone("mobile.report.generated")).toBe("lilac")
    expect(actionTone("charge.applied")).toBe("brand")
    expect(actionTone("mobile.session.revoked")).toBe("danger")
    expect(recordLine(event("a", now))).toBe("Member · 3f2a91c0")
    expect(
      activeFilterCount({ action: "approved", area: null, entityType: null, fromDate: "2026-11-01", search: "", toDate: null })
    ).toBe(2)
  })
})
