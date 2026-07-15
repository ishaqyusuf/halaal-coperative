import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"

export type ContributionLedgerRow = {
  amount: number | string | { toString(): string }
  committedAmount: number | string | { toString(): string } | null
  extraSavingsAmount: number | string | { toString(): string } | null
  id: string
  member?: {
    fullName?: string | null
    memberNumber?: string | null
  } | null
  postedAt: Date
}

export const columns: ColumnDef<ContributionLedgerRow>[] = [
  {
    accessorKey: "member",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.member?.fullName ?? "Unknown member"}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.member?.memberNumber ?? "No member number"}
        </p>
      </div>
    ),
    enableHiding: false,
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 460,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "amount",
    cell: ({ row }) => formatCurrency(Number(row.original.amount)),
    enableResizing: true,
    header: "Savings",
    id: "savings",
    meta: {
      className: "w-[160px] min-w-[130px] justify-end text-right",
      headerLabel: "Savings",
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "committedAmount",
    cell: ({ row }) =>
      row.original.committedAmount
        ? formatCurrency(Number(row.original.committedAmount))
        : "n/a",
    enableResizing: true,
    header: "Committed",
    id: "committed",
    meta: {
      className: "w-[160px] min-w-[130px] justify-end text-right",
      headerLabel: "Committed",
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "extraSavingsAmount",
    cell: ({ row }) =>
      formatCurrency(Number(row.original.extraSavingsAmount ?? 0)),
    enableResizing: true,
    header: "Extra savings",
    id: "extraSavings",
    meta: {
      className: "w-[180px] min-w-[150px] justify-end text-right",
      headerLabel: "Extra savings",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "postedAt",
    cell: ({ row }) => row.original.postedAt.toISOString().slice(0, 10),
    enableResizing: true,
    header: "Posted",
    id: "posted",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Posted",
    },
    minSize: 130,
    size: 150,
  },
]
