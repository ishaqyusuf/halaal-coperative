export function canViewMobileAdminReports(role: string | null | undefined) {
  return ["super_admin", "tenant_admin", "finance_officer"].includes(role ?? "")
}

export function canManageMobileAdminAccess(role: string | null | undefined) {
  return ["super_admin", "tenant_admin"].includes(role ?? "")
}

export function canUseMobileReportActions(
  cacheStatus: "live" | "stale" | null | undefined
) {
  return cacheStatus !== "stale"
}
