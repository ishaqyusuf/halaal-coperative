import { ChargeSearchFilter } from "@/components/charge-search-filter"
import { OpenChargeSheet } from "@/components/open-charge-sheet"
import { ChargeColumnVisibility } from "@/components/charge-column-visibility"

export function ChargeHeader({
  isLocked,
}: {
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <ChargeSearchFilter />

      <div className="flex space-x-2">
        <ChargeColumnVisibility />
        <OpenChargeSheet disabled={isLocked} />
      </div>
    </div>
  )
}
