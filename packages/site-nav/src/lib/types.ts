import type { ComponentType } from "react"

export type Access = {
  equator: "is" | "isNot" | "in" | "notIn" | "every" | "some"
  type: "role" | "permission"
  values: string[]
}

export type NavIcon = ComponentType<{ className?: string }>

export type LinkItem = {
  access?: Access[]
  globalIndex?: number
  href?: string
  icon?: NavIcon
  index?: number
  level?: number | null
  meta?: Record<string, unknown>
  name: string
  paths?: string[]
  show?: boolean
  subLinks?: LinkItem[]
  title?: string
}

export type NavModule = ReturnType<typeof createNavModule>
export type NavSection = ReturnType<typeof createNavSection>
export type NavLink = ReturnType<typeof createNavLink>["data"] | undefined

export const createNavModule = (
  name: string,
  icon?: NavIcon,
  subtitle?: string,
  sections: NavSection[] = [],
) => ({
  activeLinkCount: 0,
  activeSubLinkCount: 0,
  defaultLink: null as string | null,
  icon,
  index: -1,
  name,
  sections,
  subtitle,
  title: name,
})

export const createNavSection = (
  name: string,
  title?: string,
  links: NavLink[] = [],
  access: Access[] = [],
) => ({
  access,
  globalIndex: -1,
  index: -1,
  links: links.filter((link): link is Exclude<NavLink, undefined> => Boolean(link)),
  linksCount: 0,
  name,
  title,
})

export const createNavSubLink = (name: string, href: string, access: Access[] = []) =>
  createNavLink(name, undefined, href, [], access)

export const createNavLink = (
  name: string,
  icon?: NavIcon,
  href?: string,
  subLinks: LinkItem[] = [],
  access: Access[] = [],
) => {
  const result: LinkItem = {
    access,
    globalIndex: -1,
    href,
    icon,
    index: -1,
    level: null,
    name,
    paths: [],
    show: false,
    subLinks,
    title: name.split("-").join(" "),
  }

  const context = {
    access(...rules: Access[]) {
      result.access = rules
      return context
    },
    childPaths(...paths: string[]) {
      result.paths = paths.map((path) => (path.startsWith("/") ? path : `/${path}`))
      return context
    },
    data: result,
    level(level: number) {
      result.level = level
      return context
    },
    title(title: string) {
      result.title = title
      return context
    },
  }

  return context
}
