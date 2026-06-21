import { ShareSearchFilter } from "@/components/share-search-filter"
import { OpenShareSheet } from "@/components/open-share-sheet"

export function ShareHeader({ isLocked }: { isLocked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <ShareSearchFilter />

      <div className="hidden space-x-2 sm:flex">
        <OpenShareSheet disabled={isLocked} />
      </div>
    </div>
  )
}
