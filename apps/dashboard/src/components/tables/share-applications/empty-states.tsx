"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ShareApplicationsEmptyState({ filtered }: { filtered: boolean }) {
  const { setFilter } = useShareApplicationFilterParams()
  const { setParams } = useSortParams()

  return (
    <div className="flex min-h-[260px] items-center justify-center border-y border-border px-4 text-center md:border-y-0">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">
            {filtered ? "No matching share requests" : "No share requests"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "Try another search or clear the current filters."
              : "Share requests will appear here after they are submitted."}
          </p>
        </div>
        {filtered ? (
          <Button
            className="h-11 md:h-9"
            onClick={() =>
              void Promise.all([
                setFilter({
                  shareApplicationQ: null,
                  shareApplicationStatus: null,
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
