import { describe, expect, test } from "bun:test"
import {
  isMemberMigrationFinalized,
  isMemberOperationallyReady,
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

  test("does not require backfill for an earlier member in a tenant starting this month", () => {
    const readiness = resolveMemberOperationalReadiness(
      {
        ...baseInput,
        joinedAt: new Date("2025-02-01T00:00:00.000Z"),
        tenantStartDate: new Date("2026-07-03T00:00:00.000Z"),
      },
      now
    )

    expect(readiness).toMatchObject({
      isReady: true,
      migration: { required: false, state: "not_required" },
    })
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

describe("lighter member readiness flag", () => {
  function sqlStub(finalizedIds: string[]) {
    const calls: unknown[][] = []
    return {
      calls,
      prisma: {
        $queryRaw: async ({ values }: { values: unknown[] }) => {
          calls.push(values)
          return finalizedIds.map((id) => ({ id }))
        },
      },
    }
  }

  test("an inactive or unverified member is not ready, with no read", async () => {
    const { calls, prisma } = sqlStub(["member-1"])

    for (const member of [
      { id: "member-1", kycStatus: "verified", status: "inactive" },
      { id: "member-1", kycStatus: "pending", status: "active" },
    ] as const) {
      expect(
        await isMemberOperationallyReady(
          { member: member as never, tenantId: "tenant-1" },
          prisma as never
        )
      ).toBe(false)
    }
    expect(calls).toHaveLength(0)
  })

  test("an active verified member is ready once migration is finalized, in one statement", async () => {
    const member = {
      id: "member-1",
      kycStatus: "verified",
      status: "active",
    } as const
    const finalized = sqlStub(["member-1"])
    const unfinished = sqlStub([])

    expect(
      await isMemberOperationallyReady(
        { member: member as never, tenantId: "tenant-1" },
        finalized.prisma as never
      )
    ).toBe(true)
    expect(
      await isMemberOperationallyReady(
        { member: member as never, tenantId: "tenant-1" },
        unfinished.prisma as never
      )
    ).toBe(false)
    expect(finalized.calls).toHaveLength(1)
    expect(finalized.calls[0]).toEqual(
      expect.arrayContaining(["tenant-1", "member-1"])
    )
  })
})
