"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function ChargeLibraryEmptyState({ filtered }: { filtered: boolean }) {
  const { setFilter } = useChargeFilterParams()
  const { setParams: setSortParams } = useSortParams()

  return (
    <div className="flex min-h-56 flex-col items-center justify-center border-y border-border px-4 py-10 text-center md:border-x">
      <h3 className="font-medium">
        {filtered ? "No matching charges" : "No charge definitions yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Try another search or clear the active filters."
          : "Create a reusable charge before posting charges to members."}
      </p>
      {filtered ? (
        <Button
          className="mt-4 h-11 md:h-9"
          onClick={() => {
            void Promise.all([
              setFilter({
                frequency: null,
                q: null,
                status: null,
                valueType: null,
              }),
              setSortParams({ sort: null }),
            ])
          }}
          type="button"
          variant="outline"
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}
