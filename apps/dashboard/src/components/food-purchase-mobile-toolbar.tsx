"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import { FoodPurchaseFilterDrawer } from "@/components/food-purchase-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function FoodPurchaseMobileToolbar({
  canCreate,
  hasOpenCycle,
  selfService = false,
}: {
  canCreate: boolean
  hasOpenCycle: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useFoodPurchaseFilterParams()
  const { params, setParams: setSortParams } = useSortParams()
  const { setParams } = useFoodPurchaseParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(filter.q || filter.status || params.sort)

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <InputGroup className="h-12 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search foodstuff requests"
              onChange={(event) =>
                void setFilter({ q: event.target.value || null })
              }
              placeholder="Search"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter foodstuff requests"
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
                hasOpenCycle ? undefined : "food-purchase-create-disabled"
              }
              className="h-12 px-4"
              disabled={!hasOpenCycle}
              onClick={() =>
                void setParams({
                  foodPurchaseApplicationId: null,
                  foodPurchaseCycleId: null,
                  foodPurchaseSheetType: selfService
                    ? "self-service"
                    : "application",
                })
              }
              type="button"
            >
              <Plus data-icon="inline-start" />
              New
            </Button>
          ) : null}
        </div>
        {canCreate && !hasOpenCycle ? (
          <p className="sr-only" id="food-purchase-create-disabled">
            No month is open for requests.
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
        <FoodPurchaseFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
