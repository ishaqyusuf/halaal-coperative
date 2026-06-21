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
import { ChargeSheet } from "@/components/sheets/charge-sheet"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useChargeParams } from "@/hooks/use-charge-params"
import { columns, type Charge } from "./columns"
import { EmptyState, NoResults } from "./empty-states"

type Props = {
  hasSourceRows?: boolean
  isLocked: boolean
  rows: Charge[]
}

export function DataTable({ hasSourceRows, isLocked, rows }: Props) {
  const hasRows = hasSourceRows ?? rows.length > 0
  const { filter } = useChargeFilterParams()
  const { setParams } = useChargeParams()
  const searchValue = filter.q ?? ""
  const filteredRows = rows.filter((row) => {
    const matchesStatus =
      !filter.status ||
      (filter.status === "active" ? row.isActive : !row.isActive)
    const matchesFrequency =
      !filter.frequency || row.chargeFrequency === filter.frequency
    const matchesValueType =
      !filter.valueType || row.chargeValueType === filter.valueType

    return matchesStatus && matchesFrequency && matchesValueType
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

      const charge = row.original
      const searchable = [
        charge.name,
        charge.code,
        charge.kind,
        charge.chargeFrequency,
        charge.chargeValueType,
        charge.isActive ? "active" : "inactive",
        charge.currentVersion?.amount.toString() ?? "",
        charge.currentVersion?.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    },
    meta: {
      isLocked,
      onAddUpdate: (id: string) => {
        setParams({ chargeId: id, chargeType: "update" })
      },
      onEditVersion: (chargeId: string, versionId: string) => {
        setParams({ chargeId, chargeType: "edit", chargeVersionId: versionId })
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
                  setParams({ chargeId: row.original.id, chargeType: "update" })
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

      <ChargeSheet isLocked={isLocked} rows={rows} />
    </div>
  )
}
