import type { DashboardImportKind } from "@/lib/import-csv"
import { ImportSearchFilter } from "@/components/import-search-filter"
import { OpenImportSheet } from "@/components/sheets/import-sheet"

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

      {importKind ? (
        <div className="flex space-x-2">
          <OpenImportSheet
            disabled={!canManageImports || isLocked}
            importKind={importKind}
          />
        </div>
      ) : null}
    </div>
  )
}
