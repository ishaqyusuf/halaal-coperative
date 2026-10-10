"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search } from "lucide-react"
import { ProcurementFilterDrawer } from "@/components/procurement-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ProcurementMobileToolbar({
  canCreate,
  createDisabled,
  selfService = false,
}: {
  canCreate: boolean
  createDisabled?: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useProcurementFilterParams()
  const { setParams: setProcurementParams } = useProcurementParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(filter.q || filter.status || params.sort)

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <InputGroup className="h-11 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search procurement requests"
              onChange={(event) =>
                void setFilter({ q: event.target.value || null })
              }
              placeholder="Search requests..."
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter procurement requests"
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canCreate ? (
            <Button
              aria-describedby={
                createDisabled ? "procurement-create-disabled" : undefined
              }
              aria-label={
                selfService
                  ? "Request item purchase"
                  : "Create procurement request"
              }
              className="size-11"
              disabled={createDisabled}
              onClick={() =>
                void setProcurementParams({
                  procurementRequestId: null,
                  procurementSheetType: selfService ? "self-service" : "create",
                })
              }
              size="icon-lg"
              type="button"
            >
              <Plus />
            </Button>
          ) : null}
        </div>
        {canCreate && createDisabled ? (
          <p className="sr-only" id="procurement-create-disabled">
            Add an eligible member before creating a procurement request.
          </p>
        ) : null}
        {hasActiveControls ? (
          <Button
            className="h-11 px-0"
            onClick={() =>
              void Promise.all([
                setFilter({ q: null, status: null }),
                setSortParams({ sort: null }),
              ])
            }
            type="button"
            variant="link"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      {filterOpen ? (
        <ProcurementFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
