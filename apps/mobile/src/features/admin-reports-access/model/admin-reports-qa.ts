import type {
  AdminReports,
  AdminReportsQaState,
} from "./admin-reports-access-types"

function staleCache(
  reports: AdminReports,
  reason: "offline" | "stale"
) {
  return {
    ageMs: reports.cache?.ageMs ?? 15 * 60 * 1000,
    cachedAt: reports.cache?.cachedAt ?? reports.generatedAt,
    reason,
    scope: reports.cache?.scope ?? "ticket-09-qa",
    status: "stale" as const,
  }
}

export function presentAdminReportsForQa(
  reports: AdminReports,
  qaState: AdminReportsQaState | null
): AdminReports {
  if (qaState === "empty") {
    return {
      ...reports,
      activityEvents: [],
      collectionFollowUps: [],
      reports: [],
      stats: reports.stats.map((metric) => ({ ...metric, value: 0 })),
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return { ...reports, cache: staleCache(reports, qaState) }
  }

  return reports
}
