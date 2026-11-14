"use client"

import {
  OpenMemberProjectFinancingRequestSheet,
  OpenProjectFinancingRequestSheet,
} from "@/components/open-project-financing-sheet"
import { ProjectFinancingColumnVisibility } from "@/components/project-financing-column-visibility"
import { ProjectFinancingSearchFilter } from "@/components/project-financing-search-filter"

export function ProjectFinancingHeader({
  canCreate,
  hasMemberOptions = true,
  selfService = false,
}: {
  canCreate: boolean
  hasMemberOptions?: boolean
  selfService?: boolean
}) {
  return (
    <div className="hidden items-center justify-between gap-3 pb-4 md:flex">
      <ProjectFinancingSearchFilter />
      <div className="flex items-center gap-2">
        <ProjectFinancingColumnVisibility />
        {canCreate ? (
          selfService ? (
            <OpenMemberProjectFinancingRequestSheet />
          ) : (
            <OpenProjectFinancingRequestSheet disabled={!hasMemberOptions} />
          )
        ) : null}
      </div>
    </div>
  )
}
