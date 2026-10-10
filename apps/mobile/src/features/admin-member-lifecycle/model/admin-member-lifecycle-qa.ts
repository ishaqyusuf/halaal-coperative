import type {
  MobileAdminLifecycleQaState,
  MobileAdminMemberDetail,
  MobileAdminMembers,
  MobileAdminOverview,
} from "./admin-member-lifecycle-types"

function staleCache(
  generatedAt: string,
  existing: MobileAdminOverview["cache"],
  reason: "offline" | "stale",
  scope: string
) {
  return {
    ageMs: existing?.ageMs ?? 15 * 60 * 1000,
    cachedAt: existing?.cachedAt ?? generatedAt,
    reason,
    scope: existing?.scope ?? scope,
    status: "stale" as const,
  }
}

export function presentAdminOverviewForQa(
  overview: MobileAdminOverview,
  qaState: MobileAdminLifecycleQaState | null
): MobileAdminOverview {
  if (qaState === "empty") {
    return {
      ...overview,
      actionQueue: [],
      complianceWatch: [],
      recentActivity: [],
      warnings: [],
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...overview,
      cache: staleCache(
        overview.generatedAt,
        overview.cache,
        qaState,
        "ticket-07-overview-qa"
      ),
    }
  }

  return overview
}

export function presentAdminMembersForQa(
  members: MobileAdminMembers,
  qaState: MobileAdminLifecycleQaState | null
): MobileAdminMembers {
  if (qaState === "empty") {
    return {
      ...members,
      members: [],
      onboardingRequests: [],
      page: 1,
      reviewQueues: [],
      summary: {
        activeCount: 0,
        kycPendingCount: 0,
        linkedUsersCount: 0,
        pageCount: 0,
        totalCount: 0,
      },
      total: 0,
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...members,
      cache: staleCache(
        members.generatedAt,
        members.cache,
        qaState,
        "ticket-07-members-qa"
      ),
    }
  }

  return members
}

export function presentAdminMemberDetailForQa(
  detail: MobileAdminMemberDetail,
  qaState: MobileAdminLifecycleQaState | null
): MobileAdminMemberDetail {
  if (qaState === "not-found") {
    return { ...detail, member: null, sections: [], stats: [] }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...detail,
      cache: staleCache(
        detail.generatedAt,
        detail.cache,
        qaState,
        "ticket-07-member-detail-qa"
      ),
    }
  }

  return detail
}
