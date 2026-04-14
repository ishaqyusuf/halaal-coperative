"use client"

import { cn } from "@halaal-vest/ui/lib/utils"
import type { LinkItem } from "../lib/types"
import { NavLink } from "./nav-link"

export function NavChildItem({
  child,
  isActive,
}: {
  child: LinkItem
  isActive: boolean
}) {
  if (!child.href || child.show === false) {
    return null
  }

  return (
    <div className="pl-14 pr-3 pb-1">
      <NavLink
        href={child.href}
        className={cn(
          "block rounded-xl px-3 py-2 text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {child.title ?? child.name}
      </NavLink>
    </div>
  )
}
