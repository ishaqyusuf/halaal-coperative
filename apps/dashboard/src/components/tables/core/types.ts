import type { ColumnDef } from "@tanstack/react-table"
import type { RefObject } from "react"
import type { TableId } from "@/utils/table-settings"

export type SkeletonType =
  | "checkbox"
  | "text"
  | "avatar-text"
  | "icon-text"
  | "badge"
  | "tags"
  | "icon"

export interface TableScrollState {
  containerRef: RefObject<HTMLDivElement | null>
  canScrollLeft: boolean
  canScrollRight: boolean
  isScrollable: boolean
  scrollLeft: () => void
  scrollRight: () => void
}

export interface StickyColumnConfig {
  id: string
  width: number
}

export interface TableConfig {
  tableId: TableId
  stickyColumns: StickyColumnConfig[]
  sortFieldMap: Record<string, string>
  nonReorderableColumns: Set<string>
  rowHeight: number
  summaryGridHeight?: number
}

export interface SkeletonConfig {
  type: SkeletonType
  width?: string
}

export interface TableColumnMeta {
  className?: string
  sticky?: boolean
  sortField?: string
  skeleton?: SkeletonConfig
  headerLabel?: string
}

export function getColumnId<T>(col: ColumnDef<T>): string {
  return col.id || (col as { accessorKey?: string }).accessorKey || ""
}

export function getHeaderLabel<T>(col: ColumnDef<T>): string {
  const meta = col.meta as TableColumnMeta | undefined
  if (meta?.headerLabel) {
    return meta.headerLabel
  }

  const id = getColumnId(col)
  return id
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

export const ACTIONS_FULL_WIDTH_HEADER_CLASS =
  "group/header relative h-full px-4 !border-t border-border flex items-center justify-center bg-background z-10"

export const ACTIONS_STICKY_HEADER_CLASS =
  "group/header relative h-full px-4 !border-t !border-l !border-border flex items-center justify-center md:sticky md:right-0 bg-background z-10"

export const ACTIONS_FULL_WIDTH_CELL_CLASS =
  "bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f]"
