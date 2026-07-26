import { describe, expect, test } from "bun:test"
import {
  getMemberMigrationAction,
  getMemberMigrationStartHref,
  getMemberMigrationStartStep,
  shouldOpenMemberMigrationAfterCreate,
} from "./member-migration-routing"

describe("member migration routing", () => {
  const now = new Date("2026-06-30T12:00:00.000Z")

  test("routes brought-forward tenants to the current-position step", () => {
    expect(getMemberMigrationStartStep("brought_forward")).toBe(
      "brought-forward"
    )
    expect(getMemberMigrationStartHref("member-1", "brought_forward")).toBe(
      "/members/member-1/backfill?step=brought-forward"
    )
  })

  test("routes historical tenants to the existing backfill baseline", () => {
    expect(getMemberMigrationStartStep("historical_backfill")).toBe("baseline")
    expect(getMemberMigrationStartHref("member-1", "historical_backfill")).toBe(
      "/members/member-1/backfill?step=baseline"
    )
  })

  test("opens migration after create according to tenant setup mode", () => {
    expect(
      shouldOpenMemberMigrationAfterCreate({
        joinedAt: "2026-06-30",
        now,
        setupMode: "brought_forward",
      })
    ).toBe(true)
    expect(
      shouldOpenMemberMigrationAfterCreate({
        joinedAt: "2026-06-30",
        now,
        setupMode: "historical_backfill",
      })
    ).toBe(false)
    expect(
      shouldOpenMemberMigrationAfterCreate({
        joinedAt: "2026-05-31",
        now,
        setupMode: "historical_backfill",
      })
    ).toBe(true)
  })

  test("turns applied member migrations into non-actionable statuses", () => {
    expect(
      getMemberMigrationAction({
        setupMode: "brought_forward",
        state: "applied",
      })
    ).toEqual({
      kind: "status",
      label: "Brought forward applied",
    })
    expect(
      getMemberMigrationAction({
        setupMode: "historical_backfill",
        state: "applied",
      })
    ).toEqual({
      kind: "status",
      label: "Backfilled",
    })
    expect(
      getMemberMigrationAction({
        setupMode: "historical_backfill",
        state: "draft",
      })
    ).toEqual({
      kind: "action",
      label: "Continue backfill",
    })
  })
})
