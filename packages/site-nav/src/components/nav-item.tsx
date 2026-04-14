"use client"

import type { MouseEvent } from "react"
import { cn } from "@halaal-vest/ui/lib/utils"
import type { NavModule, NavLink as NavLinkType } from "../lib/types"
import { isPathInLink, normalizeNavPath } from "../lib/links"
import { NavChildItem } from "./nav-child-item"
import { NavLink } from "./nav-link"
import { useSiteNav } from "./use-site-nav"

export function NavItem({
  isActive,
  isExpanded,
  item,
  onToggle,
}: {
  isActive: boolean
  isExpanded: boolean
  item: NavLinkType
  module: NavModule
  onToggle: (path?: string) => void
}) {
  const {
    props: { pathName },
  } = useSiteNav()
  const normalizedPathName = normalizeNavPath(pathName?.toLowerCase() ?? "")
  if (!item) {
    return null
  }

  const hasChildren = Boolean(item?.subLinks?.length)
  const Icon = item?.icon
  const hasActiveChild = hasChildren
    ? item?.subLinks?.some((child) => isPathInLink(normalizedPathName, child))
    : false

  if (!item?.href && !hasChildren) {
    return null
  }

  return (
    <div className="space-y-1">
      <NavLink
        href={item?.href ?? "#"}
        className={cn(
          "group mx-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          !isExpanded && "justify-center px-2",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
            isActive ? "border-primary/20 bg-primary/10 text-primary" : "border-border/60 bg-background",
          )}
        >
          {Icon ? <Icon className="size-4" /> : <span className="size-2 rounded-full bg-current" />}
        </span>
        {isExpanded ? (
          <>
            <span className={cn("min-w-0 flex-1 truncate", isActive && "font-semibold")}>
              {item.title ?? item.name}
            </span>
            {hasChildren ? (
                <button
                  type="button"
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onToggle(item.href)
                }}
                className={cn(
                  "text-muted-foreground transition-transform",
                  (hasActiveChild || isActive) && "rotate-180",
                )}
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
          </>
        ) : null}
      </NavLink>

      {isExpanded && hasChildren && (hasActiveChild || isActive) ? (
        <div className="space-y-1">
          {item?.subLinks?.map((child) => (
            <NavChildItem key={child.href ?? child.name} child={child} isActive={isPathInLink(normalizedPathName, child)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
