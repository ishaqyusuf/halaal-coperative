import { describe, expect, test } from "bun:test"
import {
  isMemberMigrationFinalized,
  resolveMemberOperationalReadiness,
} from "./member-readiness"

const now = new Date("2026-07-29T12:00:00.000Z")
const baseInput = {
  joinedAt: new Date("2026-07-01T00:00:00.000Z"),
  kycStatus: "verified" as const,
  memberStatus: "active" as const,
  migrationSetupMode: "historical_backfill" as const,
  tenantStartDate: null,
}

describe("member operational readiness", () => {
  test("does not require historical backfill for a current-month member", () => {
    const readiness = resolveMemberOperationalReadiness(baseInput, now)

    expect(readiness).toMatchObject({
      isReady: true,
      issues: [],
      migration: {
        required: false,
        state: "not_required",
      },
      status: "verified",
    })
    expect(isMemberMigrationFinalized(readiness)).toBe(true)
  })

  test("requires every expected historical month before verification", () => {
    const draft = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        appliedBackfillMonthKeys: [],
        joinedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      now
    )
    const applied = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        appliedBackfillMonthKeys: ["2026-06", "2026-07"],
        joinedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      now
    )

    expect(draft).toMatchObject({
      isReady: false,
      issues: ["migration_incomplete"],
      migration: { state: "not_started" },
      status: "action_required",
    })
    expect(applied).toMatchObject({
      isReady: true,
      migration: { state: "applied" },
      status: "verified",
    })
  })

  test("requires an applied opening position in brought-forward mode", () => {
    const missing = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        migrationSetupMode: "brought_forward",
      },
      now
    )
    const applied = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        appliedOpeningBalanceId: "opening-balance-1",
        migrationSetupMode: "brought_forward",
      },
      now
    )

    expect(missing).toMatchObject({
      isReady: false,
      issues: ["migration_incomplete"],
      migration: { state: "not_started" },
    })
    expect(applied).toMatchObject({
      isReady: true,
      migration: { state: "applied" },
    })
    expect(isMemberMigrationFinalized(missing)).toBe(false)
    expect(isMemberMigrationFinalized(applied)).toBe(true)
  })

  test("keeps inactive or unverified members action-required", () => {
    const readiness = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        kycStatus: "pending",
        memberStatus: "suspended",
      },
      now
    )

    expect(readiness).toMatchObject({
      isReady: false,
      issues: ["member_inactive", "kyc_unverified"],
      status: "action_required",
    })
  })
})
