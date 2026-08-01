"use client"

import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { useEffect, type ReactNode } from "react"
import { MembersColumnVisibility } from "./members-column-visibility"
import { MembersMobileToolbar } from "./members-mobile-toolbar"
import { MembersSearchFilter } from "./members-search-filter"
import { OpenMemberImportSheet } from "@/components/open-member-sheet"
import { useMemberParams } from "@/hooks/use-member-params"

export function MembersHeader({
  createAction,
  importPanel,
  migrationSetupMode,
  startWithImportPanelOpen = false,
  secondaryActions,
}: {
  createAction?: ReactNode
  importPanel?: ReactNode
  migrationSetupMode?: TenantMigrationSetupMode
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
      <div className="hidden items-start justify-between gap-3 md:flex">
        <MembersSearchFilter migrationSetupMode={migrationSetupMode} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <MembersColumnVisibility />
          {secondaryActions}
          {importPanel ? <OpenMemberImportSheet /> : null}
          {createAction}
        </div>
      </div>

      <MembersMobileToolbar
        canCreateMember={Boolean(createAction)}
        canImportMembers={Boolean(importPanel)}
        migrationSetupMode={migrationSetupMode ?? "historical_backfill"}
        showSignupLink={Boolean(secondaryActions)}
      />

      {importPanel}
    </div>
  )
}
