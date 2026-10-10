"use client"

import {
  OpenMemberSupportCaseCreateSheet,
  OpenSupportCaseCreateSheet,
} from "@/components/open-support-case-sheet"
import { SupportColumnVisibility } from "@/components/support-column-visibility"
import { SupportMobileToolbar } from "@/components/support-mobile-toolbar"
import { SupportSearchFilter } from "@/components/support-search-filter"

export function SupportHeader({
  assignees,
  canCreateSupportCases,
  mode,
}: {
  assignees: Array<{ id: string; label: string }>
  canCreateSupportCases: boolean
  mode: "member" | "staff"
}) {
  return (
    <div className="border-y border-border bg-transparent py-3">
      <div className="md:hidden">
        <SupportMobileToolbar
          assignees={assignees}
          canCreateSupportCases={canCreateSupportCases}
          mode={mode}
        />
      </div>
      <div className="hidden items-center justify-between gap-3 md:flex">
        <SupportSearchFilter assignees={assignees} mode={mode} />
        <div className="flex items-center gap-2">
          <SupportColumnVisibility />
          {canCreateSupportCases ? (
            mode === "member" ? (
              <OpenMemberSupportCaseCreateSheet />
            ) : (
              <OpenSupportCaseCreateSheet />
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
