import { BusinessColumnVisibility } from "@/components/business-column-visibility"
import {
  OpenBusinessSheet,
  OpenReviewNoBusinessProfitSheet,
} from "@/components/open-business-sheet"
import {
  BusinessSearchFilter,
} from "@/components/business-search-filter"

export function BusinessHeader({
  canRecordBusiness,
  canReviewNoProfit,
}: {
  canRecordBusiness: boolean
  canReviewNoProfit: boolean
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <BusinessSearchFilter />

      <div className="flex shrink-0 items-center gap-2">
        <BusinessColumnVisibility />
        <OpenBusinessSheet disabled={!canRecordBusiness} />
        {canReviewNoProfit ? <OpenReviewNoBusinessProfitSheet /> : null}
      </div>
    </div>
  )
}
