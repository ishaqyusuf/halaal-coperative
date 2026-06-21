import { BusinessSearchFilter } from "@/components/business-search-filter"
import { OpenBusinessSheet } from "@/components/open-business-sheet"
import { OpenReviewNoBusinessProfitSheet } from "@/components/sheets/business-sheet"

export function BusinessHeader({
  canReviewNoProfit,
  isLocked,
}: {
  canReviewNoProfit: boolean
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <BusinessSearchFilter />

      <div className="hidden space-x-2 sm:flex">
        {canReviewNoProfit ? <OpenReviewNoBusinessProfitSheet /> : null}
        <OpenBusinessSheet disabled={isLocked} />
      </div>
    </div>
  )
}
