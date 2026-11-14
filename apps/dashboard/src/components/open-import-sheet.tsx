"use client"

import { FileUp } from "lucide-react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { useImportParams } from "@/hooks/use-import-params"
import type { DashboardImportKind } from "@/lib/import-csv"
import { importKindWords } from "@/lib/imports/import-words"

/** The page's one primary action: open the "add from a spreadsheet" modal. */
export function OpenImportSheet({
  className,
  importKind,
}: {
  className?: string
  importKind: DashboardImportKind
}) {
  const { setParams } = useImportParams()

  return (
    <Button
      className={cn(
        "h-auto min-h-12 w-full py-3 text-base whitespace-normal sm:w-auto sm:self-start",
        className
      )}
      onClick={() =>
        setParams({
          importBatchId: null,
          importSheetType: "create",
          importType: importKind,
        })
      }
      type="button"
    >
      <FileUp aria-hidden />
      Add {importKindWords[importKind].many} from a spreadsheet
    </Button>
  )
}
