"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import type { PageFilterData } from "@halaalvest/utils"
import { MembersSearchFilter } from "./members-search-filter"

export function MembersHeader({
  createAction,
  filterList,
  importPanel,
  startWithImportPanelOpen = false,
  secondaryActions,
}: {
  createAction?: React.ReactNode
  filterList?: PageFilterData[]
  importPanel?: React.ReactNode
  startWithImportPanelOpen?: boolean
  secondaryActions?: React.ReactNode
}) {
  const [showImportPanel, setShowImportPanel] = useState(startWithImportPanelOpen)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <MembersSearchFilter initialFilterList={filterList} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {importPanel ? (
            <Button
              className="rounded-full"
              onClick={() => setShowImportPanel((current) => !current)}
              size="sm"
              type="button"
              variant={showImportPanel ? "default" : "outline"}
            >
              Import members
            </Button>
          ) : null}
          {createAction}
        </div>
      </div>

      {showImportPanel ? <div id="member-import">{importPanel}</div> : null}
    </div>
  )
}
