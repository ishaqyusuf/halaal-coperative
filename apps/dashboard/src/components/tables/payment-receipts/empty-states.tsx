"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  clearedPaymentReceiptFilters,
  usePaymentReceiptFilterParams,
} from "@/hooks/use-payment-receipt-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function PaymentReceiptsEmptyState({
  filtered = false,
}: {
  filtered?: boolean
}) {
  const { setFilter } = usePaymentReceiptFilterParams()
  const { setParams } = useSortParams()

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-b border-border px-4 text-center">
      <div>
        <p className="text-sm font-medium text-foreground">
          {filtered
            ? "No matching payment receipts"
            : "No payment receipts yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered
            ? "Clear the active filters and try another search."
            : "Submitted payment proofs will appear here for finance review."}
        </p>
      </div>
      {filtered ? (
        <Button
          className="h-11 md:h-9"
          onClick={() =>
            void Promise.all([
              setFilter(clearedPaymentReceiptFilters),
              setParams({ sort: null }),
            ])
          }
          variant="outline"
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}
