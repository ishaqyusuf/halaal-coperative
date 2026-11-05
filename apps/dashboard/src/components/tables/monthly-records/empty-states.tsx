"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { useSortParams } from "@/hooks/use-sort-params"

// A month with no record, or a record with no seeded member rows. The page GET
// never creates either; "Create month" opens the create confirm, which runs
// `ensureMonthlyRecord` and seeds the rows.
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
      <div>
        <p className="text-sm font-medium text-foreground">
          {periodLabel
            ? `${periodLabel} has no member rows yet.`
            : "No monthly record for this month yet."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the month to stage a row for every active member.
        </p>
      </div>
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
          size="sm"
          type="button"
        >
          <PlusIcon data-icon="inline-start" />
          Create month
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
      <p className="text-sm text-muted-foreground">
        No member rows match the current filters.
      </p>
      <Button
        onClick={() =>
          void Promise.all([
            setFilter({ q: null, status: null }),
            setSortParams({ sort: null }),
          ])
        }
        size="sm"
        type="button"
        variant="outline"
      >
        Clear filters
      </Button>
    </div>
  )
}
