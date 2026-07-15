"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
} from "@/lib/import-csv"

export function OpenImportSheet({
  disabled,
  importKind,
}: {
  disabled: boolean
  importKind: DashboardImportKind
}) {
  const { setParams } = useImportParams()

  return (
    <Button
      aria-label={`Import ${dashboardImportConfigs[importKind].title}`}
      disabled={disabled}
      onClick={() =>
        setParams({
          importBatchId: null,
          importSheetType: "create",
          importType: importKind,
        })
      }
      size="icon"
      type="button"
      variant="outline"
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
    </Button>
  )
}
