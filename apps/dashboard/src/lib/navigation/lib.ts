import { getRoleDisplayName, type CooperativeRole } from "@halaalvest/auth/roles"
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
      module.sections.some((section) =>
        section.links.some((item) => item.show)
      )
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
  return (
    items.find(
      (item) =>
        item.name === active.name && isPathActive(pathname, item.href ?? "")
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

export function getDashboardQuickLinks(pathname: string, modules: NavModule[]) {
  const currentModule = getCurrentDashboardModule(pathname, modules)
  return (
    currentModule?.sections
      .flatMap((section) => section.links.filter((item) => item.show))
      .slice(0, 6) ?? []
  )
}

export function getDashboardRouteTitle(
  pathname: string,
  role: CooperativeRole | null,
  hiddenPaths: string[] = []
) {
  const modules = getVisibleDashboardNav(role, hiddenPaths)
  const activeItem = getActiveDashboardNavItem(pathname, modules)
  const currentModule = getCurrentDashboardModule(pathname, modules)

  return {
    activeItem,
    currentModule,
    modules,
    roleLabel: getRoleDisplayName(role),
  }
}

export function canAccessDashboardPath(
  pathname: string,
  role: CooperativeRole | null
) {
  const linksMap = getLinkModules(
    validateLinks({
      linkModules: dashboardNavRegistry,
      role,
    })
  ).linksNameMap
  const normalizedPath = normalizePath(pathname).toLowerCase()

  if (!normalizedPath) {
    return true
  }

  const entries = Object.entries(linksMap).map(([href, data]) => ({
    data,
    href: normalizePath(href).toLowerCase(),
  }))
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
export type DashboardQuickLink = NonNullable<
  ReturnType<typeof getDashboardQuickLinks>[number]
>
