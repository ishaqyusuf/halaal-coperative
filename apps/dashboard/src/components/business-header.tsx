import { BusinessColumnVisibility } from "@/components/business-column-visibility"
import {
  OpenBusinessSheet,
  OpenReviewNoBusinessProfitSheet,
} from "@/components/open-business-sheet"
import { BusinessMobileToolbar } from "@/components/business-mobile-toolbar"
import { BusinessSearchFilter } from "@/components/business-search-filter"

export function BusinessHeader({
  canRecordBusiness,
  canReviewNoProfit,
  dividendPeriods,
}: {
  canRecordBusiness: boolean
  canReviewNoProfit: boolean
  dividendPeriods: Array<{ id: string; label: string }>
}) {
  return (
    <div className="space-y-4">
      <div className="hidden items-start justify-between gap-3 md:flex">
        <BusinessSearchFilter />

        <div className="flex shrink-0 items-center gap-2">
          <BusinessColumnVisibility />
          <OpenBusinessSheet disabled={!canRecordBusiness} />
          {canReviewNoProfit ? <OpenReviewNoBusinessProfitSheet /> : null}
        </div>
      </div>

      <BusinessMobileToolbar
        canRecordBusiness={canRecordBusiness}
        canReviewNoProfit={canReviewNoProfit}
        dividendPeriods={dividendPeriods}
      />
    </div>
  )
}
