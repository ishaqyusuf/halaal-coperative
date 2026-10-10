"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function RepaymentsEmptyState({
  description,
  filtered,
  filteredTitle,
  title,
}: {
  description: string
  filtered: boolean
  filteredTitle: string
  title: string
}) {
  const { setFilters } = useRepaymentsFilterParams()
  const { setParams } = useSortParams()

  return (
    <div className="flex min-h-[260px] items-center justify-center border-y border-border px-4 text-center md:border-y-0">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">
            {filtered ? filteredTitle : title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "Try another search or clear the current filters."
              : description}
          </p>
        </div>
        {filtered ? (
          <Button
            className="h-11 md:h-9"
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
                setParams({ sort: null }),
              ])
            }
            type="button"
            variant="outline"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}
