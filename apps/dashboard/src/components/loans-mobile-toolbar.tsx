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
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import { LoanColumnVisibility } from "@/components/loan-column-visibility"
import {
  getLoanSortOptions,
  LoansFilterDrawer,
  portfolioStatuses,
  requestStatuses,
} from "@/components/loans-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useMobileViewport } from "@/hooks/use-mobile"
import {
  clearedLoanFilters,
  useLoanFilterParams,
} from "@/hooks/use-loan-filter-params"
import { useLoanParams } from "@/hooks/use-loan-params"
import { useSortParams } from "@/hooks/use-sort-params"

type LoanPortfolioStatus = (typeof portfolioStatuses)[number]["id"]
type LoanRequestStatus = (typeof requestStatuses)[number]["id"]

export function LoansToolbar({
  canSubmit,
  intakeDisabled,
  intakeDisabledReason,
}: {
  canSubmit: boolean
  intakeDisabled: boolean
  intakeDisabledReason?: string | null
}) {
  const { filter, setFilter } = useLoanFilterParams()
  const activeView = filter.view ?? "requests"
  const { setParams: setLoanParams } = useLoanParams()
  const { params, setParams: setSortParams } = useSortParams()
  const isMobile = useMobileViewport()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false)
  const hasActiveControls =
    Boolean(filter.q || params.sort) ||
    (activeView === "requests"
      ? Boolean(filter.requestStatus)
      : Boolean(filter.portfolioStatus))

  function openRequest() {
    void setLoanParams({
      guarantorApprovalId: null,
      guarantorReviewStatus: null,
      loanId: null,
      loanRequestId: null,
      loanReviewStatus: null,
      loanSheetType: "request",
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <InputGroup className="h-11 min-w-0 flex-1 md:hidden">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={
              activeView === "requests"
                ? "Search loan requests"
                : "Search loan portfolio"
            }
            onChange={(event) =>
              void setFilter({ q: event.target.value || null })
            }
            placeholder={
              activeView === "requests"
                ? "Search requests..."
                : "Search portfolio..."
            }
            type="search"
            value={filter.q ?? ""}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={
                activeView === "requests"
                  ? "Filter loan requests"
                  : "Filter loan portfolio"
              }
              className="size-11"
              onClick={() => setMobileFilterOpen(true)}
              size="icon-sm"
            >
              <MiddayFilterIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <DesktopLoanFilter
          activeView={activeView}
          filterOpen={desktopFilterOpen}
          onFilterOpenChange={setDesktopFilterOpen}
        />
        <div className="hidden md:block">
          <LoanColumnVisibility tableType={activeView} />
        </div>
        {canSubmit ? (
          <Button
            aria-describedby={
              intakeDisabled ? "loan-intake-blocker" : undefined
            }
            aria-label="Request loan"
            className="size-11 md:hidden"
            disabled={intakeDisabled}
            onClick={openRequest}
            size="icon-lg"
            title={intakeDisabledReason ?? undefined}
            type="button"
          >
            <Plus />
          </Button>
        ) : null}
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
      <InputGroup className="hidden h-9 w-[350px] md:flex">
        <InputGroupAddon align="inline-start">
          <Search aria-hidden className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={
            activeView === "requests"
              ? "Search loan requests"
              : "Search loan portfolio"
          }
          onChange={(event) =>
            void setFilter({ q: event.target.value || null })
          }
          placeholder={
            activeView === "requests"
              ? "Search requests..."
              : "Search portfolio..."
          }
          type="search"
          value={filter.q ?? ""}
        />
        <InputGroupAddon align="inline-end">
          <DropdownMenuTrigger
            render={
              <InputGroupButton
                aria-label={
                  activeView === "requests"
                    ? "Filter loan requests"
                    : "Filter loan portfolio"
                }
                className={
                  filterActive || filterOpen
                    ? "size-9 text-foreground"
                    : "size-9 text-muted-foreground"
                }
                size="icon-sm"
              />
            }
          >
            <MiddayFilterIcon />
          </DropdownMenuTrigger>
        </InputGroupAddon>
      </InputGroup>

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
