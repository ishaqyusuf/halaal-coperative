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
import { BusinessSheet } from "@/components/sheets/business-sheet"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useBusinessParams } from "@/hooks/use-business-params"
import { columns, type Business, type DividendPeriodOption } from "./columns"
import { EmptyState, NoResults } from "./empty-states"

type Props = {
  canReviewNoProfit: boolean
  dividendPeriods: DividendPeriodOption[]
  financeStartDate?: string | null
  hasSourceRows?: boolean
  isLocked: boolean
  rows: Business[]
}

export function DataTable({
  canReviewNoProfit,
  dividendPeriods,
  financeStartDate,
  hasSourceRows,
  isLocked,
  rows,
}: Props) {
  const hasRows = hasSourceRows ?? rows.length > 0
  const { filter } = useBusinessFilterParams()
  const { setParams } = useBusinessParams()
  const searchValue = filter.q ?? ""
  const filteredRows = rows.filter((row) => {
    const latest = row.profitEntries[0]
    const matchesStatus = !filter.status || row.status === filter.status
    const matchesProfitStatus =
      !filter.profitStatus || latest?.status === filter.profitStatus

    return matchesStatus && matchesProfitStatus
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

      const business = row.original
      const latest = business.profitEntries[0]
      const searchable = [
        business.name,
        business.notes ?? "",
        business.status,
        business.startDate,
        business.endDate ?? "",
        business.capitalAmount.toString(),
        business.profitAmount.toString(),
        latest?.profitDate ?? "",
        latest?.reason ?? "",
        latest?.status ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    },
    meta: {
      isLocked,
      onAddProfit: (id: string) => {
        setParams({ businessId: id, businessType: "profit" })
      },
      onEditBusiness: (id: string) => {
        setParams({ businessId: id, businessType: "edit" })
      },
      onEditProfit: (businessId: string, profitEntryId: string) => {
        setParams({ businessId, businessType: "editProfit", profitEntryId })
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
                  setParams({
                    businessId: row.original.id,
                    businessType: "profit",
                  })
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

      <BusinessSheet
        canReviewNoProfit={canReviewNoProfit}
        dividendPeriods={dividendPeriods}
        financeStartDate={financeStartDate}
        isLocked={isLocked}
        rows={rows}
      />
    </div>
  )
}
