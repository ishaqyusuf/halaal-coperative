import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  LIVE_TABLE_IDLE_AFTER_MS,
  LIVE_TABLE_POLL_INTERVAL_MS,
  msUntilLivePollingIdle,
  resolveLiveTablePollInterval,
} from "./live-polling-policy"

const now = 1_000_000_000

describe("resolveLiveTablePollInterval", () => {
  test("polls at the live cadence while visible, online and recently used", () => {
    expect(
      resolveLiveTablePollInterval({
        lastActivityAt: now - 1_000,
        now,
        online: true,
        visible: true,
      })
    ).toBe(LIVE_TABLE_POLL_INTERVAL_MS)
  })

  test("stops polling when hidden, offline or idle", () => {
    const active = {
      lastActivityAt: now - 1_000,
      now,
      online: true,
      visible: true,
    }
    expect(resolveLiveTablePollInterval({ ...active, visible: false })).toBe(
      false
    )
    expect(resolveLiveTablePollInterval({ ...active, online: false })).toBe(
      false
    )
    expect(
      resolveLiveTablePollInterval({
        ...active,
        lastActivityAt: now - LIVE_TABLE_IDLE_AFTER_MS,
      })
    ).toBe(false)
  })

  test("never polls faster than every 30 seconds and idles within Neon's suspend window", () => {
    expect(LIVE_TABLE_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(30_000)
    expect(LIVE_TABLE_IDLE_AFTER_MS).toBeLessThanOrEqual(5 * 60_000)
  })

  test("reports the remaining time before an active session idles", () => {
    expect(
      msUntilLivePollingIdle({
        lastActivityAt: now - 60_000,
        now,
        online: true,
        visible: true,
      })
    ).toBe(LIVE_TABLE_IDLE_AFTER_MS - 60_000)
    expect(
      msUntilLivePollingIdle({
        lastActivityAt: now - LIVE_TABLE_IDLE_AFTER_MS * 2,
        now,
        online: true,
        visible: true,
      })
    ).toBe(0)
  })
})

describe("dashboard table polling conformance", () => {
  // The activity log (/reports/audit) is a plain paged list with no polling.
  const tables = [
    "charges",
    "shares",
  ]

  test.each(tables)("%s table uses the activity-gated poll interval", (table) => {
    const source = readFileSync(
      join(import.meta.dir, "../components/tables", table, "data-table.tsx"),
      "utf8"
    )
    expect(source).toContain("useLiveTablePollInterval()")
    expect(source).toContain("refetchInterval: livePollInterval")
    expect(source).not.toMatch(/refetchInterval:\s*\d/)
  })
})

describe("monthly records rows", () => {
  // Every write on the page (mark paid, undo, workplace receive, start month)
  // refreshes or invalidates the rows, so the query does not poll.
  test("do not poll", () => {
    const source = readFileSync(
      join(
        import.meta.dir,
        "../components/tables/monthly-records/use-monthly-records-query.ts"
      ),
      "utf8"
    )
    expect(source).not.toContain("refetchInterval")
  })
})

describe("notifications list", () => {
  test("does not poll: the email log refreshes on focus and on filter change", () => {
    const source = readFileSync(
      join(import.meta.dir, "../components/notifications/notification-list.tsx"),
      "utf8"
    )

    expect(source).not.toContain("refetchInterval")
    expect(source).toContain("useSuspenseInfiniteQuery")
  })
})
