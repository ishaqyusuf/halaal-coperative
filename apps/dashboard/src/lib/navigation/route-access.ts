import { cooperativeRoles, type CooperativeRole } from "@halaalvest/auth/roles"
import { canAccessDashboardPath } from "./lib"

/**
 * Maps a request path to the route path the role guard checks. Next can serve
 * a route's RSC payload at `<route>.rsc` or `<route>.segments/...`, so those
 * suffixes are stripped; percent-encoding is decoded so `/an%61lytics` cannot
 * slip past an exact match.
 */
export function normalizeDashboardRoutePath(pathname: string) {
  let path = pathname

  try {
    path = decodeURIComponent(pathname)
  } catch {
    // Malformed encoding: check the raw path, which Next will not route anyway.
  }

  return path
    .replace(/\.segments(\/.*)?$/, "")
    .replace(/(\.prefetch)?\.rsc$/, "")
}

/**
 * True when at least one cooperative role may not open this path. Only these
 * paths need the signed-in role, so open paths cost the proxy no database
 * call. A platform owner without a membership (role `null`) is checked on
 * restricted paths but does not make an open path restricted.
 */
export function isRoleRestrictedDashboardPath(pathname: string) {
  const path = normalizeDashboardRoutePath(pathname)

  return cooperativeRoles.some((role) => !canAccessDashboardPath(path, role))
}

export function canRoleOpenDashboardPath(
  pathname: string,
  role: CooperativeRole | null
) {
  return canAccessDashboardPath(normalizeDashboardRoutePath(pathname), role)
}
