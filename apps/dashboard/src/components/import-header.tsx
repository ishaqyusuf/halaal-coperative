import type { DashboardImportKind } from "@/lib/import-csv"
import { ImportColumnVisibility } from "@/components/import-column-visibility"
import { ImportMobileToolbar } from "@/components/import-mobile-toolbar"
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
    <>
      <ImportMobileToolbar
        canManageImports={canManageImports}
        importKind={importKind}
        isLocked={isLocked}
      />

      <div className="hidden items-center justify-between gap-3 md:flex">
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
    </>
  )
}
