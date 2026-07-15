import type { ImportBatchSummary } from "@/components/forms/import-forms"

export type ImportBatchRow = ImportBatchSummary & {
  errorMessage?: string | null
  rows?: Array<{
    duplicateInFile: boolean
    existingMatch: boolean
    id: string
    primaryValue: string | null
    rowIndex: number
  }>
  totalRows?: number
}
