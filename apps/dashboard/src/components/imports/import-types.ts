import type { DashboardImportKind } from "@/lib/import-csv"

/** Whether each kind of import can be used now, and why not. */
export type ImportAvailability = Record<
  DashboardImportKind,
  {
    blockedReason?: string
    isAvailable: boolean
  }
>

/** One import batch as the lists show it (`imports.batches`). */
export type ImportBatchSummary = {
  appliedAt: Date | null
  createdAt: Date
  createdByUser: { email: string; fullName: string; id: string }
  duplicateRowCount: number
  errorMessage: string | null
  existingMatchCount: number
  id: string
  importType: string
  status: string
  totalRows: number
  validRows: number
}

/** A batch opened in the dialog (`imports.batch`): its first rows and total. */
export type ImportBatchDetail = ImportBatchSummary & {
  rows: Array<{
    duplicateInFile: boolean
    existingMatch: boolean
    id: string
    payload: unknown
    primaryValue: string | null
    rowIndex: number
  }>
  totalAmount: number | null
}
