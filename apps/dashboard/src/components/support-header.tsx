"use client"

import type { ReactNode } from "react"
import { OpenSupportCaseCreateSheet } from "@/components/open-support-case-sheet"
import { SupportColumnVisibility } from "@/components/support-column-visibility"
import { SupportSearchFilter } from "@/components/support-search-filter"

export function SupportHeader({
  action,
  description = "Track service issues, assignments, replies, and finance-adjustment review.",
  title = "Support cases",
}: {
  action?: ReactNode
  description?: string
  title?: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SupportSearchFilter />
        <div className="flex items-center gap-2">
          <SupportColumnVisibility />
          {action === undefined ? <OpenSupportCaseCreateSheet /> : action}
        </div>
      </div>
    </div>
  )
}
