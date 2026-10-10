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
import { RepaymentsFilterDrawer } from "@/components/repayments-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function RepaymentsMobileToolbar({
  canPostRepayment,
}: {
  canPostRepayment: boolean
}) {
  const { filters, setFilters } = useRepaymentsFilterParams()
  const { setParams: setRepaymentParams } = useRepaymentParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(
    filters.assignedToUserId ||
      filters.dateRange?.length ||
      filters.memberId ||
      filters.q ||
      filters.repaymentStatus ||
      filters.resolutionStatus ||
      filters.scheduleStatus ||
      filters.stage ||
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
              aria-label="Search repayments"
              onChange={(event) =>
                void setFilters({ q: event.target.value || null })
              }
              placeholder="Search repayments..."
              type="search"
              value={filters.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter repayments"
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canPostRepayment ? (
            <Button
              aria-label="Post repayment"
              className="size-11"
              onClick={() =>
                void setRepaymentParams({
                  loanId: null,
                  repaymentId: null,
                  repaymentScheduleItemId: null,
                  repaymentSheetType: "post",
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
                  assignedToUserId: null,
                  dateRange: null,
                  memberId: null,
                  q: null,
                  repaymentStatus: null,
                  resolutionStatus: null,
                  scheduleStatus: null,
                  stage: null,
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
          <RepaymentsFilterDrawer
            onOpenChange={setFilterOpen}
            open={filterOpen}
          />
        </Suspense>
      ) : null}
    </>
  )
}
