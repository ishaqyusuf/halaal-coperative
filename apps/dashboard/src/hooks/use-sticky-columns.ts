import type { VisibilityState } from "@tanstack/react-table"
import { useCallback, useMemo } from "react"
import type { CSSProperties } from "react"
import { cn } from "@halaalvest/ui/lib/utils"
import type { StickyColumnConfig } from "@/components/tables/core"
import { STICKY_COLUMNS } from "@/utils/table-configs"

interface TableColumn {
  id: string
  getIsVisible: () => boolean
}

interface TableInterface {
  getAllLeafColumns: () => TableColumn[]
}

interface UseStickyColumnsProps {
  columnVisibility?: VisibilityState
  table?: TableInterface
  loading?: boolean
  stickyColumns?: StickyColumnConfig[]
}

export function useStickyColumns({
  columnVisibility,
  table,
  loading,
  stickyColumns = STICKY_COLUMNS.members,
}: UseStickyColumnsProps) {
  const isVisible = useCallback(
    (id: string) =>
      loading ||
      table
        ?.getAllLeafColumns()
        .find((col) => col.id === id)
        ?.getIsVisible() ||
      (columnVisibility && columnVisibility[id] !== false),
    [loading, table, columnVisibility]
  )

  const stickyColumnIds = useMemo(
    () => new Set(stickyColumns.map((col) => col.id)),
    [stickyColumns]
  )

  const stickyPositions = useMemo(() => {
    const checkVisible = (id: string) =>
      loading ||
      table
        ?.getAllLeafColumns()
        .find((col) => col.id === id)
        ?.getIsVisible() ||
      (columnVisibility && columnVisibility[id] !== false)

    let position = 0
    const positions: Record<string, number> = {}

    for (const col of stickyColumns) {
      if (checkVisible(col.id)) {
        positions[col.id] = position
        position += col.width
      }
    }

    return positions
  }, [loading, table, columnVisibility, stickyColumns])

  const getStickyStyle = useCallback(
    (columnId: string) => {
      const position = stickyPositions[columnId]
      return position !== undefined
        ? ({ "--stick-left": `${position}px` } as CSSProperties)
        : {}
    },
    [stickyPositions]
  )

  const getStickyClassName = useCallback(
    (columnId: string, baseClassName?: string) => {
      const isSticky = stickyColumnIds.has(columnId)
      return cn(
        baseClassName,
        isSticky && "md:sticky md:left-[var(--stick-left)]"
      )
    },
    [stickyColumnIds]
  )

  return {
    stickyPositions,
    getStickyStyle,
    getStickyClassName,
    isVisible,
  }
}
