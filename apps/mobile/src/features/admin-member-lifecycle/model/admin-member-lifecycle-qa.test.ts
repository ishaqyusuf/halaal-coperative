import { describe, expect, test } from "bun:test"
import type {
  MobileAdminMemberDetail,
  MobileAdminMembers,
  MobileAdminOverview,
} from "./admin-member-lifecycle-types"
import {
  presentAdminMemberDetailForQa,
  presentAdminMembersForQa,
  presentAdminOverviewForQa,
} from "./admin-member-lifecycle-qa"

const generatedAt = "2026-08-31T01:00:00.000Z"

const overview = {
  actionQueue: [
    {
      count: 2,
      detail: "Two reviews",
      key: "reviews",
      label: "Member reviews",
      severity: "warning" as const,
    },
  ],
  complianceWatch: [{ count: 1, key: "kyc", label: "KYC pending" }],
  generatedAt,
  recentActivity: [
    {
      detail: "Approved",
      id: "activity-1",
      label: "Member",
      occurredAt: generatedAt,
    },
  ],
  stats: [
    {
      detail: "Active",
      format: "number" as const,
      key: "members",
      label: "Members",
      value: 4,
    },
  ],
  warnings: [{ key: "prefix", label: "Prefix required" }],
} satisfies MobileAdminOverview

const members = {
  generatedAt,
  memberExpansion: {
    activeMemberCount: 1,
    activeMemberLimit: 100,
    planCode: "free_beta",
    planName: "Free Beta",
    reason: null,
    status: "available" as const,
  },
  members: [
    {
      activeMonthlyCommitment: 25_000,
      deductionSourceName: null,
      email: "member@ishaq.qa.test",
      fullName: "QA Member",
      id: "member-1",
      joinedAt: generatedAt,
      kycStatus: "pending",
      linkedUserEmail: "member@ishaq.qa.test",
      memberNumber: "QA-0001",
      memberType: "individual",
      phoneNumber: null,
      status: "active",
    },
  ],
  onboardingRequests: [],
  page: 1,
  pageSize: 20,
  reviewQueues: [],
  summary: {
    activeCount: 1,
    kycPendingCount: 1,
    linkedUsersCount: 1,
    pageCount: 1,
    totalCount: 1,
  },
  total: 1,
} satisfies MobileAdminMembers

const detail = {
  generatedAt,
  member: {
    ...members.members[0],
    exitedAt: null,
    linkedUserName: "QA Member",
  },
  sections: [],
  stats: [],
} satisfies MobileAdminMemberDetail

describe("admin member lifecycle QA presentation", () => {
  test("creates a calm overview without erasing authoritative metrics", () => {
    const result = presentAdminOverviewForQa(overview, "empty")
    expect(result.stats).toEqual(overview.stats)
    expect(result.actionQueue).toEqual([])
    expect(result.complianceWatch).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.recentActivity).toEqual([])
  })

  test("distinguishes offline and stale overview snapshots", () => {
    expect(presentAdminOverviewForQa(overview, "offline").cache?.reason).toBe(
      "offline"
    )
    expect(presentAdminOverviewForQa(overview, "stale").cache?.reason).toBe(
      "stale"
    )
  })

  test("creates an empty directory with internally consistent counts", () => {
    const result = presentAdminMembersForQa(members, "empty")
    expect(result.members).toEqual([])
    expect(result.total).toBe(0)
    expect(result.summary).toEqual({
      activeCount: 0,
      kycPendingCount: 0,
      linkedUsersCount: 0,
      pageCount: 0,
      totalCount: 0,
    })
  })

  test("marks member directory snapshots with their exact reason", () => {
    expect(presentAdminMembersForQa(members, "offline").cache?.reason).toBe(
      "offline"
    )
    expect(presentAdminMembersForQa(members, "stale").cache?.reason).toBe(
      "stale"
    )
  })

  test("creates a not-found detail without retaining financial sections", () => {
    const result = presentAdminMemberDetailForQa(detail, "not-found")
    expect(result.member).toBeNull()
    expect(result.sections).toEqual([])
    expect(result.stats).toEqual([])
  })
})
