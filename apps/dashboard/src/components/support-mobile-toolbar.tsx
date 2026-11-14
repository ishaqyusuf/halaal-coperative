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
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { SupportFilterDrawer } from "@/components/support-filter-drawer"
import {
  clearedSupportFilters,
  useSupportFilterParams,
} from "@/hooks/use-support-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

/** Phones: one search box with a filter button; "Clear" when anything is set. */
export function SupportMobileToolbar({
  assignees,
  mode,
}: {
  assignees: Array<{ id: string; label: string }>
  mode: "member" | "staff"
}) {
  const { filter, setFilter } = useSupportFilterParams()
  const { params, setParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(
    filter.q ||
      filter.status ||
      (mode === "staff" &&
        (filter.priority || filter.category || filter.assignedToUserId)) ||
      params.sort
  )

  return (
    <>
      <div className="grid gap-2 pb-2 md:hidden" data-support-mobile-header>
        <form onSubmit={(event) => event.preventDefault()}>
          <InputGroup className="h-12">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-5" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search cases"
              autoComplete="off"
              className="text-base"
              onChange={(event) => setFilter({ q: event.target.value || null })}
              placeholder="Search"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter cases"
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
        {hasActiveControls ? (
          <Button
            className="h-11 justify-self-start px-0 text-base"
            onClick={() =>
              void Promise.all([
                setFilter(clearedSupportFilters),
                setParams({ sort: null }),
              ])
            }
            type="button"
            variant="link"
          >
            Clear search and filters
          </Button>
        ) : null}
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
