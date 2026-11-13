import {
  getRoleDisplayName,
  type CooperativeRole,
} from "@halaalvest/auth/roles"
import {
  getActiveLinkFromMap,
  getLinkModules,
  validateLinks,
  type NavModule,
} from "@halaalvest/site-nav"
import { dashboardNavRegistry } from "./registry"

function normalizePath(pathname: string) {
  if (!pathname) {
    return "/"
  }

  if (pathname === "/") {
    return pathname
  }

  return pathname.replace(/\/+$/, "")
}

function isPathActive(pathname: string, href: string) {
  const normalizedPath = normalizePath(pathname)
  const normalizedHref = normalizePath(href)

  return (
    normalizedPath === normalizedHref ||
    normalizedPath.startsWith(`${normalizedHref}/`)
  )
}

export function getVisibleDashboardNav(
  role: CooperativeRole | null,
  hiddenPaths: string[] = []
): NavModule[] {
  const hiddenPathSet = new Set(
    hiddenPaths.map((path) => normalizePath(path).toLowerCase())
  )

  return validateLinks({
    linkModules: dashboardNavRegistry,
    role,
  })
    .map((module) => ({
      ...module,
      sections: module.sections.map((section) => ({
        ...section,
        links: section.links.map((item) => ({
          ...item,
          show:
            item.show &&
            !hiddenPathSet.has(normalizePath(item.href ?? "").toLowerCase()),
        })),
      })),
    }))
    .filter((module) =>
      module.sections.some((section) => section.links.some((item) => item.show))
    )
}

export function getActiveDashboardNavItem(
  pathname: string,
  modules: NavModule[]
) {
  const linksMap = getLinkModules(modules).linksNameMap
  const active = getActiveLinkFromMap(pathname, linksMap)
  if (!active?.name) {
    return null
  }

  const items = modules.flatMap((module) =>
    module.sections.flatMap((section) => section.links)
  )
  const directItem = items.find(
    (item) =>
      item.name === active.name && isPathActive(pathname, item.href ?? "")
  )

  if (directItem) {
    return directItem
  }

  return (
    items.find((item) =>
      item.subLinks?.some(
        (subLink) =>
          subLink.name === active.name &&
          isPathActive(pathname, subLink.href ?? "")
      )
    ) ?? null
  )
}

export function getCurrentDashboardModule(
  pathname: string,
  modules: NavModule[]
) {
  return (
    modules.find((module) =>
      module.sections.some((section) =>
        section.links.some(
          (item) => item.show && isPathActive(pathname, item.href ?? "")
        )
      )
    ) ??
    modules[0] ??
    null
  )
}

// Routes that have no sidebar link of their own. Without this the topbar
// falls back to the first module ("Workspace overview · Dashboard").
const offNavRouteTitles = [
  {
    paths: ["/getting-started", "/onboarding-success", "/onboarding"],
    subtitle: "Set up your cooperative",
    title: "Getting started",
  },
]

export function getOffNavRouteTitle(pathname: string) {
  return (
    offNavRouteTitles.find((route) =>
      route.paths.some((path) => isPathActive(pathname, path))
    ) ?? null
  )
}

export function getDashboardRouteTitle(
  pathname: string,
  role: CooperativeRole | null,
  hiddenPaths: string[] = []
) {
  const modules = getVisibleDashboardNav(role, hiddenPaths)
  const titleModules = getVisibleDashboardNav(role)
  const activeItem = getActiveDashboardNavItem(pathname, titleModules)
  const currentModule = getCurrentDashboardModule(pathname, titleModules)
  const offNavTitle = activeItem ? null : getOffNavRouteTitle(pathname)

  return {
    activeItem,
    currentModule,
    modules,
    pageSubtitle: offNavTitle?.subtitle ?? currentModule?.subtitle ?? null,
    pageTitle: offNavTitle?.title ?? activeItem?.title ?? "Dashboard",
    roleLabel: getRoleDisplayName(role),
  }
}

type DashboardAccessEntry = {
  data: ReturnType<typeof getLinkModules>["linksNameMap"][string]
  href: string
}

// The registry is static, so each role's access entries are built once per
// process. The proxy checks every role on restricted paths, per request.
const accessEntriesByRole = new Map<
  CooperativeRole | null,
  DashboardAccessEntry[]
>()

function getAccessEntries(role: CooperativeRole | null) {
  const cached = accessEntriesByRole.get(role)

  if (cached) {
    return cached
  }

  const linksMap = getLinkModules(
    validateLinks({
      linkModules: dashboardNavRegistry,
      role,
    })
  ).linksNameMap
  const entries = Object.entries(linksMap).map(([href, data]) => ({
    data,
    href: normalizePath(href).toLowerCase(),
  }))
  accessEntriesByRole.set(role, entries)

  return entries
}

export function canAccessDashboardPath(
  pathname: string,
  role: CooperativeRole | null
) {
  const normalizedPath = normalizePath(pathname).toLowerCase()

  if (!normalizedPath) {
    return true
  }

  const entries = getAccessEntries(role)
  const exactMatch = entries.find((entry) => entry.href === normalizedPath)

  if (exactMatch) {
    return exactMatch.data.hasAccess !== false
  }

  const partialMatch = entries
    .filter(
      (entry) =>
        entry.data.match === "part" && normalizedPath.startsWith(entry.href)
    )
    .sort((left, right) => right.href.length - left.href.length)[0]

  return partialMatch ? partialMatch.data.hasAccess !== false : true
}

export type DashboardRouteTitle = ReturnType<typeof getDashboardRouteTitle>
