// Pure, browser-safe routing rules for the initial-migration setup gate.
// `setup-gate.ts` re-exports these next to the database-backed gate resolver;
// client components (the dashboard sidebar) import this module directly so the
// navigation labels and the layout redirect share one predicate.

export const initialMigrationSetupPaths = [
  "/getting-started",
  "/onboarding-success",
  "/settings/operation-profile",
  "/settings/finance/migration",
  "/settings/imports",
  "/settings/profile",
]

export const navigationLockedAfterSetupLabel = "After setup"

function isMemberMigrationSetupPath(pathname: string) {
  return (
    pathname === "/members" ||
    /^\/members\/[^/]+$/.test(pathname) ||
    /^\/members\/[^/]+\/backfill(?:\/|$)/.test(pathname)
  )
}

export function isInitialMigrationSetupPath(pathname: string) {
  return (
    isMemberMigrationSetupPath(pathname) ||
    initialMigrationSetupPaths.some(
      (setupPath) =>
        pathname === setupPath || pathname.startsWith(`${setupPath}/`)
    )
  )
}

export function resolveInitialMigrationLayoutRedirect(input: {
  pathname: string
  shouldRedirectAdminToSetup: boolean
  shouldRedirectAdminToSuccess: boolean
}) {
  if (
    input.shouldRedirectAdminToSetup &&
    !isInitialMigrationSetupPath(input.pathname)
  ) {
    return "/getting-started"
  }

  return null
}

function getHrefPathname(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] ?? ""

  if (!pathname || pathname === "/") {
    return "/"
  }

  return pathname.replace(/\/+$/, "")
}

/**
 * Label for a navigation destination the setup gate would bounce back to
 * `/getting-started`. Returns "After setup" exactly when
 * `resolveInitialMigrationLayoutRedirect` redirects that href, so the sidebar
 * can never disagree with the layout routing.
 */
export function getNavigationLockLabel(input: {
  href: string
  shouldRedirectAdminToSetup: boolean
}) {
  return resolveInitialMigrationLayoutRedirect({
    pathname: getHrefPathname(input.href),
    shouldRedirectAdminToSetup: input.shouldRedirectAdminToSetup,
    shouldRedirectAdminToSuccess: false,
  })
    ? navigationLockedAfterSetupLabel
    : null
}
