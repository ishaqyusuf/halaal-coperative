import type { DashboardImportKind } from "@/lib/import-csv"

export type ImportSortField =
  | "createdAt"
  | "createdBy"
  | "importType"
  | "reviewCount"
  | "status"
  | "totalRows"

const importSortFields = new Set<ImportSortField>([
  "createdAt",
  "createdBy",
  "importType",
  "reviewCount",
  "status",
  "totalRows",
])

const importStatuses = new Set(["applied", "draft", "failed"] as const)

function getImportSort(sort?: string[] | null) {
  if (!sort || sort.length !== 2) return null

  const [field, direction] = sort
  if (!field || !importSortFields.has(field as ImportSortField)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ImportSortField, direction] as [
    ImportSortField,
    "asc" | "desc",
  ]
}

function getImportStatus(status?: string | null) {
  return status && importStatuses.has(status as "applied" | "draft" | "failed")
    ? (status as "applied" | "draft" | "failed")
    : undefined
}

export function getImportListInput({
  importKind,
  q,
  sort,
  status,
}: {
  importKind?: DashboardImportKind
  q?: string | null
  sort?: string[] | null
  status?: string | null
}) {
  return {
    importType: importKind,
    q: q || undefined,
    sort: getImportSort(sort),
    status: getImportStatus(status),
  }
}
