"use client"

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactNode,
} from "react"
import { Button } from "@halaalvest/ui/components/button"
import { MembersColumnVisibility } from "./members-column-visibility"
import { MembersSearchFilter } from "./members-search-filter"

type ImportPanelControlProps = {
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

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
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(
    startWithImportPanelOpen
  )
  const controlledImportPanel = isValidElement<ImportPanelControlProps>(
    importPanel
  )
    ? cloneElement(importPanel, {
        onOpenChange: setIsImportPanelOpen,
        open: isImportPanelOpen,
      })
    : importPanel

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <MembersSearchFilter />

        <div className="flex items-center gap-2">
          <MembersColumnVisibility />
          {secondaryActions}
          {importPanel ? (
            <Button
              className="rounded-full"
              onClick={() => setIsImportPanelOpen(true)}
              size="sm"
              type="button"
              variant={isImportPanelOpen ? "default" : "outline"}
            >
              Import members
            </Button>
          ) : null}
          <div className="hidden sm:block">{createAction}</div>
        </div>
      </div>

      {controlledImportPanel}
    </div>
  )
}
