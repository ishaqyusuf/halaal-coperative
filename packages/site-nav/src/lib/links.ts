import { validateRules } from "./access"
import type { LinkItem, NavModule } from "./types"

export const normalizeNavPath = (path = "") =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path

export function validateLinks({
  can,
  linkModules,
  role,
  userId,
}: {
  can?: Record<string, boolean>
  linkModules: NavModule[]
  role?: string | null
  userId?: string
}) {
  const validateAccess = (accessList: LinkItem["access"] = []) =>
    validateRules(accessList, can, userId, role)

  return linkModules.map((module) => ({
    ...module,
    sections: module.sections.map((section) => ({
      ...section,
      links: section.links.filter(Boolean).map((link) => {
        const valid = validateAccess(link.access)
        const subLinks =
          link.subLinks?.map((subLink) => ({
            ...subLink,
            show: validateAccess([...(link.access ?? []), ...(subLink.access ?? [])]),
          })) ?? []

        return {
          ...link,
          show:
            subLinks.length > 0 && !link.href && !(link.access?.length ?? 0)
              ? subLinks.filter((subLink) => !subLink.meta).some((subLink) => subLink.show)
              : valid,
          subLinks,
        }
      }),
    })),
  }))
}

export function getLinkModules(linkModules: NavModule[]) {
  let sectionIndex = 0
  let linkIndex = 0
  let defaultLink: string | null = null
  const rankedLinks: Array<{ href: string; rank: number }> = []
  const linksNameMap: Record<
    string,
    {
      hasAccess?: boolean
      match?: "part"
      module?: string
      name?: string
    }
  > = {}

  const modules = linkModules.map((module, moduleIndex) => {
    let moduleLinks = 0
    let moduleDefaultLink: string | null = null

    const sections = module.sections.map((section, sectionLocalIndex) => {
      let sectionLinks = 0

      const links = section.links.filter(Boolean).map((link, linkLocalIndex) => {
        const nextLink = { ...link }

        if (nextLink.show) {
          nextLink.index = linkLocalIndex
          nextLink.globalIndex = linkIndex++
          sectionLinks += 1
          moduleLinks += 1
        }

        if (nextLink.href) {
          linksNameMap[nextLink.href] = {
            hasAccess: nextLink.show,
            module: module.name,
            name: nextLink.name,
          }

          if (nextLink.show && !moduleDefaultLink) {
            moduleDefaultLink = nextLink.href
          }

          if (nextLink.show && typeof nextLink.level === "number") {
            rankedLinks.push({ href: nextLink.href, rank: nextLink.level })
          }
        }

        nextLink.paths?.forEach((path) => {
          linksNameMap[path] = {
            hasAccess: nextLink.show,
            match: "part",
            module: module.name,
            name: nextLink.name,
          }
        })

        nextLink.subLinks =
          nextLink.subLinks?.map((subLink) => {
            const nextSubLink = { ...subLink }

            if (nextSubLink.href) {
              linksNameMap[nextSubLink.href] = {
                hasAccess: nextSubLink.show,
                module: module.name,
                name: nextSubLink.name ?? nextLink.name,
              }

              if (nextSubLink.show && !moduleDefaultLink) {
                moduleDefaultLink = nextSubLink.href
              }

              if (nextSubLink.show && typeof nextSubLink.level === "number") {
                rankedLinks.push({ href: nextSubLink.href, rank: nextSubLink.level })
              }
            }

            nextSubLink.paths?.forEach((path) => {
              linksNameMap[path] = {
                hasAccess: nextSubLink.show,
                match: "part",
                module: module.name,
                name: nextSubLink.name ?? nextLink.name,
              }
            })

            return nextSubLink
          }) ?? []

        return nextLink
      })

      return {
        ...section,
        globalIndex: sectionIndex++,
        index: sectionLocalIndex,
        links,
        linksCount: sectionLinks,
      }
    })

    if (!defaultLink && moduleDefaultLink) {
      defaultLink = moduleDefaultLink
    }

    return {
      ...module,
      activeLinkCount: moduleLinks,
      defaultLink: moduleDefaultLink,
      index: moduleIndex,
      sections,
    }
  })

  const rankedDefault = rankedLinks.sort((left, right) => left.rank - right.rank)[0]?.href
  const resolvedDefaultLink = rankedDefault ?? defaultLink
  const totalLinks = modules.reduce((sum, module) => sum + module.activeLinkCount, 0)

  return {
    defaultLink: resolvedDefaultLink,
    linksNameMap,
    moduleLinksCount: totalLinks,
    modules,
    noSidebar: totalLinks < 5,
    renderMode: totalLinks > 12 ? "default" : totalLinks < 6 ? "none" : "suppressed",
    totalLinks,
  }
}

export function getActiveLinkFromMap(
  pathname: string | null | undefined,
  linksNameMap: ReturnType<typeof getLinkModules>["linksNameMap"],
) {
  const normalizedPath = normalizeNavPath(pathname?.toLowerCase() ?? "")
  if (!normalizedPath) {
    return undefined
  }

  const exactMatch = Object.entries(linksNameMap)
    .map(([href, data]) => ({
      data,
      href: normalizeNavPath(href.toLowerCase()),
    }))
    .find((entry) => entry.href === normalizedPath && entry.data.hasAccess !== false)

  if (exactMatch) {
    return exactMatch.data
  }

  return Object.entries(linksNameMap)
    .map(([href, data]) => ({
      data,
      href: normalizeNavPath(href.toLowerCase()),
    }))
    .filter(
      (entry) =>
        entry.data.match === "part" &&
        entry.data.hasAccess !== false &&
        normalizedPath.startsWith(entry.href),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.data
}

export function isPathInLink(pathname: string | null | undefined, link?: LinkItem | null) {
  const normalizedPath = normalizeNavPath(pathname?.toLowerCase() ?? "")
  if (!normalizedPath || !link) {
    return false
  }

  const href = normalizeNavPath(link.href?.toLowerCase() ?? "")
  if (href && href === normalizedPath) {
    return true
  }

  return (link.paths ?? []).some((path) => {
    const normalizedPart = normalizeNavPath(path.toLowerCase())
    return Boolean(normalizedPart && normalizedPath.startsWith(normalizedPart))
  })
}
