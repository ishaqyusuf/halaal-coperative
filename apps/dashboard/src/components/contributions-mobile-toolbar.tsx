"use client"

import { Suspense, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search } from "lucide-react"
import { ContributionsFilterDrawer } from "@/components/contributions-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useContributionParams } from "@/hooks/use-contribution-params"
import { useContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ContributionsMobileToolbar({
  canRecord = true,
}: {
  canRecord?: boolean
}) {
  const { filters, setFilters } = useContributionsFilterParams()
  const { setParams: setContributionParams } = useContributionParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(
    filters.channel ||
    filters.dateRange?.length ||
    filters.memberId ||
    filters.search ||
    params.sort
  )

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <InputGroup className="h-11 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search contribution activity"
              onChange={(event) =>
                void setFilters({ search: event.target.value || null })
              }
              placeholder="Search activity..."
              type="search"
              value={filters.search ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter contributions"
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
                type="button"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canRecord ? (
            <Button
              aria-label="Record contribution payment"
              className="size-11"
              onClick={() =>
                void setContributionParams({
                  contributionSheetType: "payment",
                  selectedCollectionBatchId: null,
                  selectedCollectionRowId: null,
                  selectedContributionMemberId: null,
                  selectedContributionPlanId: null,
                })
              }
              size="icon-lg"
              type="button"
            >
              <Plus />
            </Button>
          ) : null}
        </div>
        {hasActiveControls ? (
          <Button
            className="h-11 px-0"
            onClick={() =>
              void Promise.all([
                setFilters({
                  channel: null,
                  dateRange: null,
                  memberId: null,
                  search: null,
                }),
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
        <Suspense fallback={null}>
          <ContributionsFilterDrawer
            onOpenChange={setFilterOpen}
            open={filterOpen}
          />
        </Suspense>
      ) : null}
    </>
  )
}
