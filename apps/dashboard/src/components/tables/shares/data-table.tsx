"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UiTableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useShareFilterParams } from "@/hooks/use-share-filter-params"
import { useShareParams } from "@/hooks/use-share-params"
import { ShareSheet } from "@/components/sheets/share-sheet"
import { columns, type Share } from "./columns"
import { EmptyState, NoResults } from "./empty-states"

type Props = {
  financeStartDate?: string | null
  hasSourceRows?: boolean
  isLocked: boolean
  rows: Share[]
}

export function DataTable({
  financeStartDate,
  hasSourceRows,
  isLocked,
  rows,
}: Props) {
  const hasRows = hasSourceRows ?? rows.length > 0
  const { filter } = useShareFilterParams()
  const { setParams } = useShareParams()
  const searchValue = filter.q ?? ""
  const filteredRows = rows.filter((row) => {
    const matchesStatus =
      !filter.status ||
      (filter.status === "current" ? row.isCurrent : !row.isCurrent)
    const matchesValueType =
      !filter.valueType || row.valueType === filter.valueType
    const matchesEffectiveFrom =
      !filter.effectiveFrom || row.effectiveFrom >= filter.effectiveFrom
    const matchesEffectiveTo =
      !filter.effectiveTo || row.effectiveFrom <= filter.effectiveTo

    return (
      matchesStatus &&
      matchesValueType &&
      matchesEffectiveFrom &&
      matchesEffectiveTo
    )
  })

  const table = useReactTable({
    columns,
    data: filteredRows,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      const query = String(value ?? "").toLowerCase()

      if (!query) {
        return true
      }

      const version = row.original
      const searchable = [
        version.effectiveFrom,
        version.valueType === "percentage"
          ? "percentage after charges"
          : "fixed amount",
        version.amount.toString(),
        version.notes ?? "",
        version.isCurrent ? "current" : "historical",
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    },
    meta: {
      isLocked,
      onEdit: (id: string) => {
        setParams({ shareId: id, shareType: "edit" })
      },
    },
    state: {
      globalFilter: searchValue,
    },
  })

  const hasFilteredRows = table.getRowModel().rows.length > 0

  return (
    <div className="w-full">
      <Table>
        <UiTableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </UiTableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              className="cursor-pointer hover:bg-muted/50"
              key={row.id}
              onClick={() => {
                if (!isLocked) {
                  setParams({ shareId: row.original.id, shareType: "edit" })
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!hasRows ? <EmptyState /> : null}
      {hasRows && !hasFilteredRows ? <NoResults /> : null}

      <ShareSheet
        financeStartDate={financeStartDate}
        isLocked={isLocked}
        rows={rows}
      />
    </div>
  )
}
