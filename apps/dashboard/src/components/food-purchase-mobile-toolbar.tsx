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
  canSubmitApplications,
  hasOpenCycle,
}: {
  canSubmitApplications: boolean
  hasOpenCycle: boolean
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
          <InputGroup className="h-11 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search Foodstuff Purchase applications"
              onChange={(event) =>
                void setFilter({ q: event.target.value || null })
              }
              placeholder="Search applications..."
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter Foodstuff Purchase applications"
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canSubmitApplications ? (
            <Button
              aria-describedby={
                hasOpenCycle ? undefined : "food-purchase-create-disabled"
              }
              aria-label="Record Foodstuff Purchase application"
              className="size-11"
              disabled={!hasOpenCycle}
              onClick={() =>
                void setParams({
                  foodPurchaseApplicationId: null,
                  foodPurchaseCycleId: null,
                  foodPurchaseSheetType: "application",
                })
              }
              size="icon-lg"
              type="button"
            >
              <Plus />
            </Button>
          ) : null}
        </div>
        {canSubmitApplications && !hasOpenCycle ? (
          <p className="sr-only" id="food-purchase-create-disabled">
            Open a monthly cycle before recording an application.
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
