"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { useState } from "react"
import { LoanColumnVisibility } from "@/components/loan-column-visibility"
import {
  getLoanSortOptions,
  LoansFilterDrawer,
  portfolioStatuses,
  requestStatuses,
} from "@/components/loans-filter-drawer"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useMobileViewport } from "@/hooks/use-mobile"
import {
  clearedLoanFilters,
  useLoanFilterParams,
} from "@/hooks/use-loan-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

type LoanPortfolioStatus = (typeof portfolioStatuses)[number]["id"]
type LoanRequestStatus = (typeof requestStatuses)[number]["id"]

export function LoansToolbar() {
  const { filter, setFilter } = useLoanFilterParams()
  const activeView = filter.view ?? "requests"
  const { params, setParams: setSortParams } = useSortParams()
  const isMobile = useMobileViewport()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false)
  const searchLabel =
    activeView === "requests" ? "Search requests" : "Search loans"
  const hasActiveControls =
    Boolean(filter.q || params.sort) ||
    (activeView === "requests"
      ? Boolean(filter.requestStatus)
      : Boolean(filter.portfolioStatus))

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 md:hidden">
          <SearchFilterDropdownInput
            aria-label={searchLabel}
            filterActive={hasActiveControls}
            filterOpen={mobileFilterOpen}
            onChange={(event) =>
              void setFilter({ q: event.target.value || null })
            }
            onFilterClick={() => setMobileFilterOpen(true)}
            placeholder="Search by name"
            value={filter.q ?? ""}
          />
        </div>
        <DesktopLoanFilter
          activeView={activeView}
          filterOpen={desktopFilterOpen}
          onFilterOpenChange={setDesktopFilterOpen}
        />
        <div className="hidden md:block">
          <LoanColumnVisibility tableType={activeView} />
        </div>
      </div>
      {hasActiveControls ? (
        <div className="flex min-h-11 items-center md:min-h-0">
          <Button
            className="h-11 px-0 md:h-auto"
            onClick={() =>
              void Promise.all([
                setFilter(clearedLoanFilters),
                setSortParams({ sort: null }),
              ])
            }
            type="button"
            variant="link"
          >
            Clear filters
          </Button>
        </div>
      ) : null}
      {isMobile && mobileFilterOpen ? (
        <LoansFilterDrawer
          activeView={activeView}
          onOpenChange={setMobileFilterOpen}
          open={mobileFilterOpen}
        />
      ) : null}
    </>
  )
}

function DesktopLoanFilter({
  activeView,
  filterOpen,
  onFilterOpenChange,
}: {
  activeView: "portfolio" | "requests"
  filterOpen: boolean
  onFilterOpenChange: (open: boolean) => void
}) {
  const { filter, setFilter } = useLoanFilterParams()
  const { params, setParams: setSortParams } = useSortParams()
  const statuses =
    activeView === "requests" ? requestStatuses : portfolioStatuses
  const sortOptions = getLoanSortOptions(activeView)
  const selectedStatus =
    activeView === "requests" ? filter.requestStatus : filter.portfolioStatus
  const selectedSort = params.sort?.join(",") ?? "memberName,asc"
  const filterActive = Boolean(selectedStatus || params.sort)

  return (
    <DropdownMenu open={filterOpen} onOpenChange={onFilterOpenChange}>
      <div className="hidden md:block">
        <SearchFilterDropdownInput
          aria-label={
            activeView === "requests" ? "Search requests" : "Search loans"
          }
          filterActive={filterActive}
          filterOpen={filterOpen}
          onChange={(event) =>
            void setFilter({ q: event.target.value || null })
          }
          placeholder="Search by name"
          value={filter.q ?? ""}
        />
      </div>

      <DropdownMenuContent
        align="end"
        alignOffset={-11}
        className="w-[280px]"
        side="bottom"
        sideOffset={12}
      >
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-0" sideOffset={8}>
                {statuses.map((status) => (
                  <DropdownMenuCheckboxItem
                    checked={selectedStatus === status.id}
                    key={status.id}
                    onCheckedChange={(checked) => {
                      if (activeView === "requests") {
                        void setFilter({
                          portfolioStatus: null,
                          requestStatus: checked
                            ? (status.id as LoanRequestStatus)
                            : null,
                        })
                      } else {
                        void setFilter({
                          portfolioStatus: checked
                            ? (status.id as LoanPortfolioStatus)
                            : null,
                          requestStatus: null,
                        })
                      }
                      onFilterOpenChange(false)
                    }}
                  >
                    {status.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-0" sideOffset={8}>
                {sortOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    checked={selectedSort === option.id}
                    key={option.id}
                    onCheckedChange={(checked) => {
                      void setSortParams({
                        sort:
                          checked && option.id !== "memberName,asc"
                            ? option.id.split(",")
                            : null,
                      })
                      onFilterOpenChange(false)
                    }}
                  >
                    {option.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        {filterActive ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                void Promise.all([
                  setFilter(clearedLoanFilters),
                  setSortParams({ sort: null }),
                ])
              }}
            >
              Clear filters
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
