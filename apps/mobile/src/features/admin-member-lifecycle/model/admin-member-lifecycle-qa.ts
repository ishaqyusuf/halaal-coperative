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

  if (qaState === "new") {
    return {
      ...overview,
      actionQueue: [
        {
          count: 1,
          detail: "Open",
          key: "setup-warnings",
          label: "Setup warnings",
          severity: "neutral",
        },
      ],
      complianceWatch: overview.complianceWatch.map((item) => ({
        ...item,
        count: 0,
      })),
      recentActivity: [],
      stats: overview.stats.map((stat) => ({
        ...stat,
        detail: stat.key === "portfolio-risk" ? "₦0 overdue" : stat.detail,
        value: 0,
      })),
      warnings: [
        { key: "initial-migration", label: "Initial migration is not finalized" },
      ],
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

export type AdminOverviewQaView = {
  isError: boolean
  isOffline: boolean
  isPending: boolean
  overview: MobileAdminOverview | null
}

/**
 * Development-only overview states for device screenshots
 * (`halaalvest-dev:///?qaState=loading|error|refresh-error|offline|stale|empty|new|denied`).
 * Load and error states drop the data; the others reshape the live read.
 */
export function applyAdminOverviewQaState(
  qaState: MobileAdminLifecycleQaState | null,
  live: AdminOverviewQaView
): AdminOverviewQaView {
  switch (qaState) {
    case "loading":
      return { isError: false, isOffline: false, isPending: true, overview: null }
    case "error":
      return { isError: true, isOffline: false, isPending: false, overview: null }
    case "refresh-error":
      return { ...live, isError: true, isOffline: false, isPending: false }
    case "offline":
      return {
        isError: false,
        isOffline: true,
        isPending: false,
        overview: live.overview
          ? presentAdminOverviewForQa(live.overview, "offline")
          : null,
      }
    case "empty":
    case "new":
    case "stale":
      return {
        ...live,
        overview: live.overview
          ? presentAdminOverviewForQa(live.overview, qaState)
          : null,
      }
    default:
      return live
  }
}
