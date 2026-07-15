"use client"

import type { ReactNode } from "react"
import { OpenProjectFinancingRequestSheet } from "@/components/open-project-financing-sheet"
import { ProjectFinancingColumnVisibility } from "@/components/project-financing-column-visibility"
import { ProjectFinancingSearchFilter } from "@/components/project-financing-search-filter"

export function ProjectFinancingHeader({
  action,
  description = "Review member business funding, approved structures, and disbursement.",
  title = "Project financing requests",
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
        <ProjectFinancingSearchFilter />
        <div className="flex items-center gap-2">
          <ProjectFinancingColumnVisibility />
          {action === undefined ? <OpenProjectFinancingRequestSheet /> : action}
        </div>
      </div>
    </div>
  )
}
