import { ChargeSearchFilter } from "@/components/charge-search-filter"
import { OpenChargeSheet } from "@/components/open-charge-sheet"

export function ChargeHeader({ isLocked }: { isLocked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <ChargeSearchFilter />

      <div className="hidden space-x-2 sm:flex">
        <OpenChargeSheet disabled={isLocked} />
      </div>
    </div>
  )
}
