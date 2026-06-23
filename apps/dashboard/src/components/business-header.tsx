import { BusinessSearchFilter } from "@/components/business-search-filter"
import { OpenBusinessSheet } from "@/components/open-business-sheet"
import { OpenReviewNoBusinessProfitSheet } from "@/components/sheets/business-sheet"
import type { DividendPeriodOption } from "@/components/tables/business/columns"

export function BusinessHeader({
  canReviewNoProfit,
  dividendPeriods,
  financeStartDate,
  isLocked,
}: {
  canReviewNoProfit: boolean
  dividendPeriods: DividendPeriodOption[]
  financeStartDate?: string | null
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <BusinessSearchFilter />

      <div className="flex space-x-2">
        {canReviewNoProfit ? <OpenReviewNoBusinessProfitSheet /> : null}
        <OpenBusinessSheet
          disabled={isLocked}
          dividendPeriods={dividendPeriods}
          financeStartDate={financeStartDate}
        />
      </div>
    </div>
  )
}
