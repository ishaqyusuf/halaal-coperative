"use client"

import type { ReactNode } from "react"
import { SupportColumnVisibility } from "@/components/support-column-visibility"
import { SupportMobileToolbar } from "@/components/support-mobile-toolbar"
import { SupportSearchFilter } from "@/components/support-search-filter"

/** Search and filters above the case list. */
export function SupportHeader({
  action,
  assignees,
  mode,
}: {
  /** Desktop only: the main action at the right of the search row. */
  action?: ReactNode
  assignees: Array<{ id: string; label: string }>
  mode: "member" | "staff"
}) {
  return (
    <>
      <SupportMobileToolbar assignees={assignees} mode={mode} />
      <div className="hidden items-center justify-between gap-3 pb-4 md:flex">
        <SupportSearchFilter assignees={assignees} mode={mode} />
        <div className="flex items-center gap-2">
          {mode === "staff" ? <SupportColumnVisibility /> : null}
          {action}
        </div>
      </div>
    </>
  )
}
