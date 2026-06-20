"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"
import { NavsList } from "./navs-list"
import { useSiteNav } from "./use-site-nav"

export function Sidebar({ children }: { children?: ReactNode }) {
  const { isExpanded, linkModules, mainMenuRef, setIsExpanded } = useSiteNav()
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current)
      }
    },
    [],
  )

  if (linkModules.noSidebar) {
    return null
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden border-r border-border/70 bg-background/95 backdrop-blur lg:flex lg:flex-col",
        isExpanded ? "w-72" : "w-24",
      )}
    >
      <div
        ref={mainMenuRef}
        onMouseEnter={() => {
          if (expandTimeoutRef.current) {
            clearTimeout(expandTimeoutRef.current)
          }
          expandTimeoutRef.current = setTimeout(() => {
            setIsExpanded(true)
            expandTimeoutRef.current = null
          }, 220)
        }}
        onMouseLeave={() => {
          if (expandTimeoutRef.current) {
            clearTimeout(expandTimeoutRef.current)
            expandTimeoutRef.current = null
          }
          setIsExpanded(false)
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {children}
        <NavsList />
      </div>
    </aside>
  )
}
