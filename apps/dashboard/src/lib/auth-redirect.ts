import { type NextRequest } from "next/server"

export function normalizeDashboardRedirectPath(
  value: string | null | undefined
) {
  if (!value || !value.startsWith("/")) {
    return "/"
  }

  if (value.startsWith("//")) {
    return "/"
  }

  if (
    value === "/login" ||
    value.startsWith("/login?") ||
    value === "/logout"
  ) {
    return "/"
  }

  if (value === "/app") {
    return "/"
  }

  if (value.startsWith("/app/")) {
    return value.slice(4)
  }

  return value
}

function normalizeRequestProtocol(input: string | null | undefined) {
  if (!input) {
    return null
  }

  const value = input.split(",")[0]?.trim().replace(/:$/, "").toLowerCase()

  if (value === "http" || value === "https") {
    return value
  }

  return null
}

function normalizeRequestHost(input: string | null | undefined) {
  const value = input?.split(",")[0]?.trim()

  return value || null
}

export function buildDashboardRedirectUrl(
  request: NextRequest,
  pathname: string
) {
  const protocol =
    normalizeRequestProtocol(request.headers.get("x-forwarded-proto")) ??
    normalizeRequestProtocol(request.nextUrl.protocol) ??
    "http"
  const host =
    normalizeRequestHost(request.headers.get("x-forwarded-host")) ??
    normalizeRequestHost(request.headers.get("host")) ??
    request.nextUrl.host

  return new URL(pathname, `${protocol}://${host}`)
}
