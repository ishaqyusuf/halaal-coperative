"use client"

import type { ReactNode } from "react"
import { OpenProjectFinancingRequestSheet } from "@/components/open-project-financing-sheet"
import { ProjectFinancingColumnVisibility } from "@/components/project-financing-column-visibility"
import { ProjectFinancingSearchFilter } from "@/components/project-financing-search-filter"

export function ProjectFinancingHeader({ action }: { action?: ReactNode }) {
  return (
    <div className="hidden items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:flex">
      <ProjectFinancingSearchFilter />
      <div className="flex items-center gap-2">
        <ProjectFinancingColumnVisibility />
        {action === undefined ? <OpenProjectFinancingRequestSheet /> : action}
      </div>
    </div>
  )
}
