"use client"

import type { ReactNode } from "react"
import { cn } from "@halaal-vest/ui/lib/utils"
import { useSiteNav } from "./use-site-nav"

export function SidebarShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { linkModules } = useSiteNav()

  return <div className={cn(className, !linkModules.noSidebar && "lg:pl-24")}>{children}</div>
}
