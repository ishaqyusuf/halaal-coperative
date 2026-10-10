"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search, Send } from "lucide-react"
import { useState } from "react"
import { ChargeLibraryFilterDrawer } from "@/components/charge-library-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ChargeLibraryMobileToolbar({
  canManageCharges,
}: {
  canManageCharges: boolean
}) {
  const { filter, setFilter } = useChargeFilterParams()
  const { setParams: setOperationParams } = useChargeOperationParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const hasControls = Boolean(
    filter.frequency ||
    filter.q ||
    filter.status ||
    filter.valueType ||
    params.sort
  )

  function openOperation(type: "application" | "definition") {
    setActionsOpen(false)
    void setOperationParams({ chargeOperationSheetType: type })
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <InputGroup className="h-11">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search charges"
            onChange={(event) =>
              void setFilter({ q: event.target.value || null })
            }
            placeholder="Search charges..."
            type="search"
            value={filter.q ?? ""}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Filter charges"
              className="size-11"
              onClick={() => setFilterOpen(true)}
              size="icon-sm"
            >
              <MiddayFilterIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex min-h-11 items-center justify-between gap-2">
          <div>
            {hasControls ? (
              <Button
                className="h-11"
                onClick={() =>
                  void Promise.all([
                    setFilter({
                      frequency: null,
                      q: null,
                      status: null,
                      valueType: null,
                    }),
                    setSortParams({ sort: null }),
                  ])
                }
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          {canManageCharges ? (
            <Button
              aria-label="Charge actions"
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
            >
              <Plus />
            </Button>
          ) : null}
        </div>
      </div>
      {filterOpen ? (
        <ChargeLibraryFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
      <MobileActionsDrawer
        description="Create a definition or post a fixed charge to a member."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Charge actions"
      >
        <div className="space-y-2">
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openOperation("definition")}
            variant="ghost"
          >
            <Plus data-icon="inline-start" /> New charge
          </Button>
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openOperation("application")}
            variant="ghost"
          >
            <Send data-icon="inline-start" /> Apply charge
          </Button>
        </div>
      </MobileActionsDrawer>
    </>
  )
}
