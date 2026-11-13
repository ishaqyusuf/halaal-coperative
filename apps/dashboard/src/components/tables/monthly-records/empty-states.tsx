"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { useSortParams } from "@/hooks/use-sort-params"

// A month with no record, or a record with no member rows. The page GET never
// creates either; "Start month" opens the confirm, which runs
// `ensureMonthlyRecord` and adds the rows.
export function MonthlyRecordsEmptyState({
  month,
  periodLabel,
  year,
}: {
  month?: number
  periodLabel?: string
  year?: number
}) {
  const { setParams } = useMonthlyRecordParams()
  const canCreate = Boolean(month && year)

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-t px-4 py-10 text-center">
      <p className="font-medium text-foreground">
        {periodLabel
          ? `${periodLabel} has no members yet.`
          : "This month has not started yet."}
      </p>
      {canCreate ? (
        <Button
          onClick={() =>
            setParams({
              monthlyRecordMemberId: null,
              monthlyRecordSheetType: "create",
              targetMonth: month ?? null,
              targetYear: year ?? null,
            })
          }
          type="button"
        >
          <PlusIcon data-icon="inline-start" />
          Start month
        </Button>
      ) : null}
    </div>
  )
}

export function MonthlyRecordsNoResults() {
  const { setFilter } = useMonthlyRecordFilterParams()
  const { setParams: setSortParams } = useSortParams()

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-t px-4 py-10 text-center">
      <p className="text-muted-foreground">No members match.</p>
      <Button
        onClick={() =>
          void Promise.all([
            setFilter({ q: null, status: null, workplaceId: null }),
            setSortParams({ sort: null }),
          ])
        }
        type="button"
        variant="outline"
      >
        Clear filters
      </Button>
    </div>
  )
}
