export function normalizeDashboardRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/app"
  }

  if (value.startsWith("//")) {
    return "/app"
  }

  if (value === "/login" || value.startsWith("/login?") || value === "/logout") {
    return "/app"
  }

  return value
}
