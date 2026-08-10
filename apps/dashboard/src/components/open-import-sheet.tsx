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
  display = "icon",
  importKind,
}: {
  className?: string
  disabled: boolean
  display?: "icon" | "label"
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
      size={display === "icon" ? "icon" : "default"}
      type="button"
      variant="outline"
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      {display === "label" ? (
        <span>Import {dashboardImportConfigs[importKind].title.toLowerCase()}</span>
      ) : null}
    </Button>
  )
}
