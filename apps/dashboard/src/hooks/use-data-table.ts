"use client"

import {
  type RowData,
  type TableOptions,
  useReactTable,
} from "@tanstack/react-table"

/**
 * Dashboard tables scroll infinitely and never use TanStack's client-side
 * pagination, expansion or grouping. TanStack still queues a page-index reset
 * in a microtask whenever the row model recomputes, and that reset always
 * writes a new state object. When `data` gets a new identity on each render
 * (for example an unmemoized `pages.flatMap`), the table re-renders itself
 * forever. During a trusted click, Escape or popstate, that loop runs at sync
 * priority and freezes the tab.
 */
export const DATA_TABLE_DEFAULTS = {
  autoResetAll: false,
} satisfies Partial<TableOptions<RowData>>

/** `useReactTable` with the auto-resets off. Every dashboard table uses this. */
export function useDataTable<TData extends RowData>(
  options: TableOptions<TData>
) {
  return useReactTable({ ...DATA_TABLE_DEFAULTS, ...options })
}
