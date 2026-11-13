/**
 * Routes whose sheets open from a URL param (`/loans?loanSheetType=request`)
 * but need the page's data to render their form. While that data loads, the
 * shell shows the sheet frame so the deep link visibly lands at once.
 */
export type DeepLinkSheetKind = "loan" | "memberDetail" | "tenantFinance"

/** Rendered by a route's `loading.tsx`; the shell watches for it. */
export const routeLoadingMarkerAttribute = "data-route-loading"

export function matchDeepLinkSheetRoute(
  pathname: string | null | undefined
): DeepLinkSheetKind | null {
  const path = (pathname ?? "").replace(/\/+$/, "") || "/"

  if (path === "/loans") {
    return "loan"
  }

  if (/^\/members\/[^/]+$/.test(path)) {
    return "memberDetail"
  }

  if (path === "/settings/finance" || path.startsWith("/settings/finance/")) {
    return "tenantFinance"
  }

  return null
}
