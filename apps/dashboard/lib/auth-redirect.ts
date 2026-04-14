export function normalizeDashboardRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/"
  }

  if (value.startsWith("//")) {
    return "/"
  }

  if (value === "/login" || value.startsWith("/login?") || value === "/logout") {
    return "/"
  }

  return value
}
