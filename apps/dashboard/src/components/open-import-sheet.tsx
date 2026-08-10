"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
} from "@/lib/import-csv"

export function OpenImportSheet({
  className,
  disabled,
  importKind,
}: {
  className?: string
  disabled: boolean
  importKind: DashboardImportKind
}) {
  const { setParams } = useImportParams()

  return (
    <Button
      aria-label={`Import ${dashboardImportConfigs[importKind].title}`}
      className={cn(className)}
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
