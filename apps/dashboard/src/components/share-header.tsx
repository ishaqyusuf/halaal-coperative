import { ShareSearchFilter } from "@/components/share-search-filter"
import { OpenShareSheet } from "@/components/open-share-sheet"

export function ShareHeader({
  financeStartDate,
  isLocked,
}: {
  financeStartDate?: string | null
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <ShareSearchFilter />

      <div className="flex space-x-2">
        <OpenShareSheet
          disabled={isLocked}
          financeStartDate={financeStartDate}
        />
      </div>
    </div>
  )
}
