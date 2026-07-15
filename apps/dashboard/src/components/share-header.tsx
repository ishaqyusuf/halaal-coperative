import { ShareSearchFilter } from "@/components/share-search-filter"
import { OpenShareSheet } from "@/components/open-share-sheet"
import { ShareColumnVisibility } from "@/components/share-column-visibility"

export function ShareHeader({
  isLocked,
}: {
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <ShareSearchFilter />

      <div className="flex space-x-2">
        <ShareColumnVisibility />
        <OpenShareSheet disabled={isLocked} />
      </div>
    </div>
  )
}
