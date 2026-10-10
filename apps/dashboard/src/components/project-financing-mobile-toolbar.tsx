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
import { ProjectFinancingFilterDrawer } from "@/components/project-financing-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ProjectFinancingMobileToolbar({
  canCreate,
  createDisabled,
  selfService = false,
}: {
  canCreate: boolean
  createDisabled?: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useProjectFinancingFilterParams()
  const { setParams: setProjectFinancingParams } = useProjectFinancingParams()
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
              aria-label="Search project financing requests"
              onChange={(event) =>
                void setFilter({ q: event.target.value || null })
              }
              placeholder="Search requests..."
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter project financing requests"
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
                createDisabled ? "project-financing-create-disabled" : undefined
              }
              aria-label={
                selfService
                  ? "Request business funding"
                  : "Create project financing request"
              }
              className="size-11"
              disabled={createDisabled}
              onClick={() =>
                void setProjectFinancingParams({
                  projectFinancingRequestId: null,
                  projectFinancingSheetType: selfService
                    ? "self-service"
                    : "create",
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
          <p className="sr-only" id="project-financing-create-disabled">
            Add an eligible member before creating a project financing request.
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
        <ProjectFinancingFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
