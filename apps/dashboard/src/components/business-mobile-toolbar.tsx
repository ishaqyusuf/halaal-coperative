"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { MoreHorizontal, Search } from "lucide-react"
import { useState } from "react"
import { BusinessFilterDrawer } from "@/components/business-filter-drawer"
import { OpenBusinessSheet } from "@/components/open-business-sheet"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useBusinessParams } from "@/hooks/use-business-params"
import { useSortParams } from "@/hooks/use-sort-params"

const clearedBusinessFilters = {
  dateRange: null,
  dividendPeriodId: null,
  hasProfitEntries: null,
  profitStatus: null,
  q: null,
  sourceType: null,
  status: null,
} as const

export function BusinessMobileToolbar({
  canRecordBusiness,
  canReviewNoProfit,
  dividendPeriods,
}: {
  canRecordBusiness: boolean
  canReviewNoProfit: boolean
  dividendPeriods: Array<{ id: string; label: string }>
}) {
  const { filter, hasFilters, setFilter } = useBusinessFilterParams()
  const { setParams: setBusinessParams } = useBusinessParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const hasActiveControls = hasFilters || Boolean(params.sort)

  function clearFilters() {
    void Promise.all([
      setFilter(clearedBusinessFilters),
      setSortParams({ sort: null }),
    ])
  }

  function reviewNoProfit() {
    setActionsOpen(false)
    void setBusinessParams({
      businessId: null,
      businessType: "reviewNone",
      profitEntryId: null,
    })
  }

  return (
    <>
      <div className="space-y-3 md:hidden" data-business-mobile-header>
        <form className="w-full" onSubmit={(event) => event.preventDefault()}>
          <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search businesses"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => setFilter({ q: event.target.value || null })}
              placeholder="Search businesses..."
              spellCheck="false"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter businesses"
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

          <div className="flex items-center gap-2">
            {canReviewNoProfit ? (
              <Button
                aria-label="More business actions"
                className="size-11"
                onClick={() => setActionsOpen(true)}
                size="icon-lg"
                type="button"
                variant="outline"
              >
                <MoreHorizontal />
              </Button>
            ) : null}
            {canRecordBusiness ? <OpenBusinessSheet iconOnly /> : null}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <BusinessFilterDrawer
          dividendPeriods={dividendPeriods}
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}

      <MobileActionsDrawer
        description="Choose a business workspace action."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Business actions"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={reviewNoProfit}
          type="button"
          variant="ghost"
        >
          Review no business profits
        </Button>
      </MobileActionsDrawer>
    </>
  )
}
