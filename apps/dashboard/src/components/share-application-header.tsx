"use client"

import type { ReactNode } from "react"
import { ShareApplicationColumnVisibility } from "@/components/share-application-column-visibility"
import { ShareApplicationSearchFilter } from "@/components/share-application-search-filter"

export function ShareApplicationHeader({
  action,
  description,
  title = "Share applications",
}: {
  action?: ReactNode
  description: string
  title?: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <ShareApplicationSearchFilter />
        <ShareApplicationColumnVisibility />
        {action}
      </div>
    </div>
  )
}
