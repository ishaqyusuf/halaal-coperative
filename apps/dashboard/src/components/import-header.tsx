import type { DashboardImportKind } from "@/lib/import-csv"
import { ImportColumnVisibility } from "@/components/import-column-visibility"
import { ImportSearchFilter } from "@/components/import-search-filter"
import { OpenImportSheet } from "@/components/open-import-sheet"

export function ImportHeader({
  canManageImports,
  importKind,
  isLocked,
}: {
  canManageImports: boolean
  importKind?: DashboardImportKind
  isLocked: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <ImportSearchFilter />

      <div className="flex shrink-0 items-center gap-2">
        <ImportColumnVisibility />
        {importKind ? (
          <OpenImportSheet
            disabled={!canManageImports || isLocked}
            importKind={importKind}
          />
        ) : null}
      </div>
    </div>
  )
}
