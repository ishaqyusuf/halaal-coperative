import { getRoleDisplayName, type CooperativeRole } from "@halaal-vest/auth"
import { dashboardNavRegistry } from "./registry"
import type { DashboardNavItem, DashboardNavModule } from "./types"

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

function canAccessRole(itemRoles: CooperativeRole[] | undefined, role: CooperativeRole | null) {
  if (!itemRoles?.length) {
    return true
  }

  if (!role) {
    return false
  }

  return itemRoles.includes(role)
}

export function getVisibleDashboardNav(role: CooperativeRole | null): DashboardNavModule[] {
  return dashboardNavRegistry
    .map((module) => ({
      ...module,
      sections: module.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessRole(item.roles, role)),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((module) => module.sections.length > 0)
}

export function getActiveDashboardNavItem(pathname: string, modules: DashboardNavModule[]) {
  const items = modules.flatMap((module) => module.sections.flatMap((section) => section.items))
  return items.find((item) => isPathActive(pathname, item.href)) ?? null
}

export function getCurrentDashboardModule(pathname: string, modules: DashboardNavModule[]) {
  return (
    modules.find((module) =>
      module.sections.some((section) => section.items.some((item) => isPathActive(pathname, item.href))),
    ) ?? modules[0] ?? null
  )
}

export function getDashboardQuickLinks(pathname: string, modules: DashboardNavModule[]) {
  const currentModule = getCurrentDashboardModule(pathname, modules)
  return currentModule?.sections.flatMap((section) => section.items).slice(0, 6) ?? []
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
export type DashboardQuickLink = DashboardNavItem
