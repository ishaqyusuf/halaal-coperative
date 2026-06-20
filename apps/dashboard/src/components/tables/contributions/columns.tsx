import { formatCurrency } from "@halaalvest/utils"
import type { TableColumn } from "@/components/tables/core"

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

export const contributionColumns: Array<TableColumn<ContributionLedgerRow>> = [
  {
    key: "member",
    label: "Member",
    render: (contribution) => (
      <div>
        <p className="font-medium text-foreground">
          {contribution.member?.fullName ?? "Unknown member"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {contribution.member?.memberNumber ?? "No member number"}
        </p>
      </div>
    ),
  },
  {
    key: "savings",
    label: "Savings",
    align: "right",
    render: (contribution) => formatCurrency(Number(contribution.amount)),
  },
  {
    key: "committed",
    label: "Committed",
    align: "right",
    render: (contribution) =>
      contribution.committedAmount
        ? formatCurrency(Number(contribution.committedAmount))
        : "n/a",
  },
  {
    key: "extraSavings",
    label: "Extra savings",
    align: "right",
    render: (contribution) =>
      formatCurrency(Number(contribution.extraSavingsAmount ?? 0)),
  },
  {
    key: "posted",
    label: "Posted",
    render: (contribution) => contribution.postedAt.toISOString().slice(0, 10),
  },
]
