"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Search } from "lucide-react"
import { useState } from "react"
import {
  OpenMemberSupportCaseCreateSheet,
  OpenSupportCaseCreateSheet,
} from "@/components/open-support-case-sheet"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { SupportFilterDrawer } from "@/components/support-filter-drawer"
import {
  clearedSupportFilters,
  useSupportFilterParams,
} from "@/hooks/use-support-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function SupportMobileToolbar({
  assignees,
  canCreateSupportCases,
  mode,
}: {
  assignees: Array<{ id: string; label: string }>
  canCreateSupportCases: boolean
  mode: "member" | "staff"
}) {
  const { filter, setFilter } = useSupportFilterParams()
  const { params, setParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(
    filter.q ||
      filter.priority ||
      filter.status ||
      (mode === "staff" &&
        (filter.category || filter.assignedToUserId)) ||
      params.sort
  )

  function clearFilters() {
    void Promise.all([
      setFilter(clearedSupportFilters),
      setParams({ sort: null }),
    ])
  }

  return (
    <>
      <div className="space-y-3" data-support-mobile-header>
        <form className="w-full" onSubmit={(event) => event.preventDefault()}>
          <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search support cases"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => setFilter({ q: event.target.value || null })}
              placeholder="Search support cases..."
              spellCheck="false"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter support cases"
                className={
                  hasActiveControls
                    ? "size-11 text-foreground"
                    : "size-11 text-muted-foreground"
                }
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <div className="flex min-h-11 items-center justify-between gap-2">
          <div>
            {hasActiveControls ? (
              <Button
                className="h-11"
                onClick={clearFilters}
                type="button"
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          {canCreateSupportCases ? (
            mode === "member" ? (
              <OpenMemberSupportCaseCreateSheet iconOnly />
            ) : (
              <OpenSupportCaseCreateSheet iconOnly />
            )
          ) : null}
        </div>
      </div>

      {filterOpen ? (
        <SupportFilterDrawer
          assignees={assignees}
          mode={mode}
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
