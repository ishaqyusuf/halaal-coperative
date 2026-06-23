import { ChargeSearchFilter } from "@/components/charge-search-filter"
import { OpenChargeSheet } from "@/components/open-charge-sheet"

export function ChargeHeader({
  financeStartDate,
  isLocked,
}: {
  financeStartDate?: string | null
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <ChargeSearchFilter />

      <div className="flex space-x-2">
        <OpenChargeSheet
          disabled={isLocked}
          financeStartDate={financeStartDate}
        />
      </div>
    </div>
  )
}
