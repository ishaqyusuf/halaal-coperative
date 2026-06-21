import { describe, expect, test } from "bun:test"
import {
  getInitialMigrationMemberReview,
  listInitialMigrationMemberReview,
} from "./migration-review"

function createMigrationReviewPrismaStub() {
  return {
    appliedBackfillMonth: {
      count: async ({ where }: any) => (where.memberId === "member-4" ? 2 : 0),
      findMany: async () => [
        { memberId: "member-4" },
        { memberId: "member-4" },
      ],
    },
    backfillBatch: {
      count: async ({ where }: any) => {
        if (where.memberId === "member-3" && where.status?.not === "applied") {
          return 1
        }

        if (where.memberId === "member-4" && where.status === "applied") {
          return 1
        }

        return 0
      },
      findMany: async () => [
        { memberId: "member-3", status: "draft" },
      ],
    },
    legacyLoanMigrationDraft: {
      count: async ({ where }: any) => (where.memberId === "member-2" ? 1 : 0),
      findMany: async () => [{ memberId: "member-2" }],
    },
    member: {
      findFirst: async ({ where }: any) =>
        [
          {
            fullName: "Aisha Bello",
            id: "member-1",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            memberNumber: "001",
          },
          {
            fullName: "Musa Ade",
            id: "member-2",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            memberNumber: "002",
          },
          {
            fullName: "Zainab Ali",
            id: "member-3",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            memberNumber: "003",
          },
          {
            fullName: "Tunde Lawal",
            id: "member-4",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            memberNumber: "004",
          },
        ].find((member) => member.id === where.id) ?? null,
      findMany: async () => [
        {
          fullName: "Aisha Bello",
          id: "member-1",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: "001",
        },
        {
          fullName: "Musa Ade",
          id: "member-2",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: "002",
        },
        {
          fullName: "Zainab Ali",
          id: "member-3",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: "003",
        },
        {
          fullName: "Tunde Lawal",
          id: "member-4",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: "004",
        },
      ],
    },
    migrationBackfillAdjustment: {
      count: async ({ where }: any) => (where.memberId === "member-2" ? 1 : 0),
      findMany: async () => [{ memberId: "member-2" }],
    },
    migrationProfitAdjustment: {
      count: async ({ where }: any) => (where.memberId === "member-2" ? 1 : 0),
      findMany: async () => [{ memberId: "member-2" }],
    },
  }
}

describe("initial migration member review", () => {
  test("derives per-member review status from migration setup and backfill batches", async () => {
    const rows = await listInitialMigrationMemberReview(
      "tenant-1",
      createMigrationReviewPrismaStub() as never,
    )

    expect(rows.map((row) => [row.memberNumber, row.status])).toEqual([
      ["001", "profile_only"],
      ["002", "configured"],
      ["003", "backfill_draft"],
      ["004", "backfill_applied"],
    ])
    expect(rows[1]).toMatchObject({
      legacyLoanDrafts: 1,
      profitAdjustments: 1,
      rowAdjustments: 1,
    })
    expect(rows[3]).toMatchObject({
      appliedBackfillBatches: 0,
      appliedBackfillMonths: 2,
      status: "backfill_applied",
    })
  })

  test("gets direct member review status without relying on the paged review list", async () => {
    const draftMember = await getInitialMigrationMemberReview(
      { memberId: "member-3", tenantId: "tenant-1" },
      createMigrationReviewPrismaStub() as never,
    )
    const appliedMember = await getInitialMigrationMemberReview(
      { memberId: "member-4", tenantId: "tenant-1" },
      createMigrationReviewPrismaStub() as never,
    )

    expect(draftMember).toMatchObject({
      backfillDraftBatches: 1,
      status: "backfill_draft",
    })
    expect(appliedMember).toMatchObject({
      appliedBackfillBatches: 1,
      appliedBackfillMonths: 2,
      status: "backfill_applied",
    })
  })
})
