import type {
  ColumnDef,
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
} from "@tanstack/react-table"

export type TableId =
  | "members"
  | "contributions"
  | "procurement"
  | "foodPurchase"
  | "projectFinancing"
  | "repaymentSchedule"
  | "repaymentHistory"
  | "support"
  | "paymentReceipts"
  | "imports"
  | "loanPortfolio"
  | "loanRequests"
  | "membershipApprovals"
  | "monthlyRecords"
  | "notifications"

export interface TableSettings {
  columns: VisibilityState
  sizing: ColumnSizingState
  order: ColumnOrderState
}

export type AllTableSettings = {
  [K in TableId]?: Partial<TableSettings>
}

export const TABLE_SETTINGS_COOKIE = "table-settings"

const TABLE_SETTINGS_COOKIE_MAX_AGE_SECONDS = 10 * 365 * 24 * 60 * 60

/**
 * Client-only. Writes the cookie that `getInitialTableSettings` reads on the
 * next server render. A server action that sets a cookie makes Next.js
 * re-render the whole route (layout and page loaders), so column changes
 * are persisted from the browser instead.
 */
export function writeTableSettingsCookie(settings: AllTableSettings) {
  document.cookie = `${TABLE_SETTINGS_COOKIE}=${encodeURIComponent(
    JSON.stringify(settings)
  )}; path=/; max-age=${TABLE_SETTINGS_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

export const defaultHiddenColumns: Record<TableId, string[]> = {
  members: [],
  contributions: [],
  procurement: ["vendor"],
  foodPurchase: ["item"],
  projectFinancing: ["disbursed"],
  repaymentSchedule: [],
  repaymentHistory: ["reference"],
  support: ["linkedRecord"],
  paymentReceipts: ["reference"],
  imports: [],
  loanPortfolio: [],
  loanRequests: [],
  membershipApprovals: [],
  monthlyRecords: [
    "balance",
    "loanStatus",
    "savings",
    "shareCharge",
    "loanDue",
    "charges",
    "finalIncome",
  ],
  notifications: [],
}

export function getDefaultColumnVisibility(tableId: TableId): VisibilityState {
  const columnsToHide = defaultHiddenColumns[tableId]
  return columnsToHide.reduce(
    (acc, col) => {
      acc[col] = false
      return acc
    },
    {} as Record<string, boolean>
  )
}

export function getDefaultTableSettings(tableId: TableId): TableSettings {
  return {
    columns: getDefaultColumnVisibility(tableId),
    sizing: {},
    order: [],
  }
}

export function mergeWithDefaults(
  saved: Partial<TableSettings> | undefined,
  tableId: TableId
): TableSettings {
  const defaults = getDefaultTableSettings(tableId)
  return {
    columns: saved?.columns ?? defaults.columns,
    sizing: saved?.sizing ?? defaults.sizing,
    order: saved?.order ?? defaults.order,
  }
}

export function getColumnIds<TData>(columns: ColumnDef<TData>[]): string[] {
  return columns
    .map(
      (col) =>
        col.id ??
        (col as ColumnDef<TData> & { accessorKey?: string }).accessorKey ??
        ""
    )
    .filter(Boolean)
}

export function normalizeColumnOrder(
  savedOrder: ColumnOrderState,
  allColumnIds: string[]
): ColumnOrderState {
  if (savedOrder.length === 0) return savedOrder

  const definedIds = new Set(allColumnIds)
  const savedIds = new Set(savedOrder)

  const orderWithoutFixedColumns = savedOrder.filter(
    (id) => id !== "actions" && id !== "select" && definedIds.has(id)
  )

  const newColumns = allColumnIds.filter(
    (id) => id !== "actions" && id !== "select" && !savedIds.has(id)
  )

  const result = [
    ...(definedIds.has("select") ? ["select"] : []),
    ...orderWithoutFixedColumns,
    ...newColumns,
  ]

  if (definedIds.has("actions")) {
    result.push("actions")
  }

  return result
}
