import { BusinessSearchFilter } from "@/components/business-search-filter"
import { OpenReviewNoBusinessProfitSheet } from "@/components/sheets/business-sheet"

export function BusinessHeader({
  canReviewNoProfit,
}: {
  canReviewNoProfit: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <BusinessSearchFilter />

      <div className="flex gap-2">
        {canReviewNoProfit ? <OpenReviewNoBusinessProfitSheet /> : null}
      </div>
    </div>
  )
}
