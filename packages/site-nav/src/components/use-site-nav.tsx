"use client"

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react"
import { getActiveLinkFromMap, getLinkModules, validateLinks } from "../lib/links"
import type { NavModule } from "../lib/types"

type SiteNavLinkComponent = ComponentType<any>

export type SiteNavContextValue = {
  activeLink: ReturnType<typeof getActiveLinkFromMap>
  currentModule:
    | (ReturnType<typeof getLinkModules>["modules"][number] & {
        href?: string
      })
    | null
  isExpanded: boolean
  linkModules: ReturnType<typeof getLinkModules>
  mainMenuRef: RefObject<HTMLDivElement | null>
  modules: Array<
    ReturnType<typeof getLinkModules>["modules"][number] & {
      href?: string
    }
  >
  props: {
    Link?: SiteNavLinkComponent
    linkModules: NavModule[]
    pathName: string
    permissions?: Record<string, boolean>
    role?: string | null
    userId?: string
  }
  setIsExpanded: Dispatch<SetStateAction<boolean>>
}

export const SiteNavContext = createContext<SiteNavContextValue | undefined>(undefined)

export function createSiteNavContext(props: SiteNavContextValue["props"]): SiteNavContextValue {
  const mainMenuRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const { activeLink, currentModule, linkModules, modules } = useMemo(() => {
    const validated = validateLinks({
      can: props.permissions,
      linkModules: props.linkModules,
      role: props.role ?? null,
      userId: props.userId,
    }) as NavModule[]
    const mapped = getLinkModules(validated)
    const activeLink = getActiveLinkFromMap(props.pathName, mapped.linksNameMap)
    const modules = mapped.modules
      .filter((module) => module.activeLinkCount && module.name)
      .map((module) => {
        const firstVisibleLink = module.sections
          .flatMap((section) => section.links.filter((link) => link.show))
          .sort((left, right) => (left.globalIndex ?? 0) - (right.globalIndex ?? 0))[0]

        const href =
          module.defaultLink ??
          firstVisibleLink?.href ??
          firstVisibleLink?.subLinks?.filter((link) => link.show)[0]?.href

        return {
          ...module,
          href,
        }
      })

    const currentModule = modules.find((module) => module.name === activeLink?.module) ?? null

    return {
      activeLink,
      currentModule,
      linkModules: mapped,
      modules,
    }
  }, [props])

  return {
    activeLink,
    currentModule,
    isExpanded,
    linkModules,
    mainMenuRef,
    modules,
    props,
    setIsExpanded,
  }
}

export function useSiteNav() {
  const context = useContext(SiteNavContext)

  if (!context) {
    throw new Error("useSiteNav must be used within a SiteNav provider")
  }

  return context
}
