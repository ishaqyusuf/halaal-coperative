"use client"

import { Fragment, useMemo, useState } from "react"
import { cn } from "@halaalvest/ui/lib/utils"
import { getActiveLinkFromMap, isPathInLink, normalizeNavPath } from "../lib/links"
import type { NavLink } from "../lib/types"
import { NavItem } from "./nav-item"
import { useSiteNav } from "./use-site-nav"

export function NavsList() {
  const {
    activeLink,
    isExpanded,
    linkModules,
    modules,
    props: { pathName },
  } = useSiteNav()
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const normalizedPathName = useMemo(() => normalizeNavPath(pathName?.toLowerCase() ?? ""), [pathName])
  const activeModuleName =
    getActiveLinkFromMap(pathName, linkModules.linksNameMap)?.module ??
    activeLink?.module ??
    null

  return (
    <nav className="mt-6 w-full overflow-y-auto pb-24">
      <div className="flex flex-col gap-5">
        {modules.map((module) => {
          const isModuleExpanded =
            expandedModule === module.name || (!expandedModule && activeModuleName === module.name)

          return (
            <Fragment key={module.name}>
              <button
                type="button"
                onClick={() => setExpandedModule(isModuleExpanded ? null : module.name)}
                className={cn(
                  "mx-3 hidden items-center justify-between text-left text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70",
                  isExpanded && "flex",
                )}
              >
                <span>{module.title}</span>
                <span>{isModuleExpanded ? "−" : "+"}</span>
              </button>

              <div className={cn("space-y-1", !isExpanded && activeModuleName !== module.name && "hidden")}>
                {module.sections.map((section) => (
                  <div key={`${module.name}-${section.name}`} className={cn(!section.linksCount && "hidden")}>
                    {isExpanded && section.title ? (
                      <p className="px-3 pb-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                        {section.title}
                      </p>
                    ) : null}

                    {section.links
                      .filter((link) => link.show)
                      .map((link) => (
                        <NavItem
                          key={link.href ?? link.name}
                          isActive={isLinkActive(normalizedPathName, link)}
                          isExpanded={isExpanded}
                          item={link}
                          module={module}
                          onToggle={() => setExpandedModule(module.name)}
                        />
                      ))}
                  </div>
                ))}
              </div>
            </Fragment>
          )
        })}
      </div>
    </nav>
  )
}

function isLinkActive(pathname: string, link: NavLink) {
  if (!link || !pathname) {
    return false
  }

  if (isPathInLink(pathname, link)) {
    return true
  }

  return (link.subLinks ?? []).some((subLink) => isPathInLink(pathname, subLink))
}
