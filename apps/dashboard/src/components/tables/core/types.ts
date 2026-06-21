import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode, RefObject } from "react"

export type TableColumn<TItem> = {
  align?: "left" | "right"
  key: string
  label: string
  render: (item: TItem) => ReactNode
}

export type SkeletonType = "text" | "badge"

export type SkeletonConfig = {
  className?: string
  type?: SkeletonType
}

export type StickyColumnConfig = {
  id: string
  width: number
}

export type TableScrollState = {
  canScrollLeft: boolean
  canScrollRight: boolean
  containerRef: RefObject<HTMLDivElement | null>
  isScrollable: boolean
  scrollLeft: () => void
  scrollRight: () => void
}

export type TableConfig = {
  nonReorderableColumns: Set<string>
  rowHeight: number
  sortFieldMap: Record<string, string>
  stickyColumns: StickyColumnConfig[]
  summaryGridHeight?: number
  tableId: string
}

export type TableColumnMeta = {
  className?: string
  headerLabel?: string
  skeleton?: SkeletonConfig
  sticky?: boolean
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
    .replace(/^./, (value) => value.toUpperCase())
    .trim()
}

export const ACTIONS_FULL_WIDTH_HEADER_CLASS =
  "group/header relative h-full px-4 !border-t border-border flex items-center justify-center bg-background z-10"

export const ACTIONS_STICKY_HEADER_CLASS =
  "group/header relative h-full px-4 !border-t !border-l !border-border flex items-center justify-center md:sticky md:right-0 bg-background z-10"

export const ACTIONS_FULL_WIDTH_CELL_CLASS =
  "bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f]"
