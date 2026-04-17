import { getRoleDisplayName, type CooperativeRole } from "@halaal-vest/auth"
import { getActiveLinkFromMap, getLinkModules, validateLinks, type NavModule } from "@halaal-vest/site-nav"
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

  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`)
}

export function getVisibleDashboardNav(role: CooperativeRole | null): NavModule[] {
  return validateLinks({
    linkModules: dashboardNavRegistry,
    role,
  }).filter((module) => module.sections.some((section) => section.links.some((item) => item.show)))
}

export function getActiveDashboardNavItem(pathname: string, modules: NavModule[]) {
  const linksMap = getLinkModules(modules).linksNameMap
  const active = getActiveLinkFromMap(pathname, linksMap)
  if (!active?.name) {
    return null
  }

  const items = modules.flatMap((module) => module.sections.flatMap((section) => section.links))
  return items.find((item) => item.name === active.name && isPathActive(pathname, item.href ?? "")) ?? null
}

export function getCurrentDashboardModule(pathname: string, modules: NavModule[]) {
  return (
    modules.find((module) =>
      module.sections.some((section) =>
        section.links.some((item) => item.show && isPathActive(pathname, item.href ?? "")),
      ),
    ) ?? modules[0] ?? null
  )
}

export function getDashboardQuickLinks(pathname: string, modules: NavModule[]) {
  const currentModule = getCurrentDashboardModule(pathname, modules)
  return currentModule?.sections.flatMap((section) => section.links.filter((item) => item.show)).slice(0, 6) ?? []
}

export function getDashboardRouteTitle(pathname: string, role: CooperativeRole | null) {
  const modules = getVisibleDashboardNav(role)
  const activeItem = getActiveDashboardNavItem(pathname, modules)
  const currentModule = getCurrentDashboardModule(pathname, modules)

  return {
    activeItem,
    currentModule,
    modules,
    roleLabel: getRoleDisplayName(role),
  }
}

export type DashboardRouteTitle = ReturnType<typeof getDashboardRouteTitle>
export type DashboardQuickLink = NonNullable<ReturnType<typeof getDashboardQuickLinks>[number]>
