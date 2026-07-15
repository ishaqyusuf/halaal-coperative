"use client"

import { useEffect, type ReactNode } from "react"
import { MembersColumnVisibility } from "./members-column-visibility"
import { MembersSearchFilter } from "./members-search-filter"
import { OpenMemberImportSheet } from "@/components/open-member-sheet"
import { useMemberParams } from "@/hooks/use-member-params"

export function MembersHeader({
  createAction,
  importPanel,
  startWithImportPanelOpen = false,
  secondaryActions,
}: {
  createAction?: ReactNode
  importPanel?: ReactNode
  startWithImportPanelOpen?: boolean
  secondaryActions?: ReactNode
}) {
  const { setParams } = useMemberParams()

  useEffect(() => {
    if (!startWithImportPanelOpen) {
      return
    }

    void setParams({
      memberSheetType: "import",
      selectedMemberId: null,
      selectedMemberStatus: null,
    })
  }, [setParams, startWithImportPanelOpen])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <MembersSearchFilter />

        <div className="flex items-center gap-2">
          <MembersColumnVisibility />
          {secondaryActions}
          {importPanel ? <OpenMemberImportSheet /> : null}
          <div className="hidden sm:block">{createAction}</div>
        </div>
      </div>

      {importPanel}
    </div>
  )
}
