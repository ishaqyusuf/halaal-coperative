import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableRow,
} from "@/components/tables/core"
import { contributionColumns, type ContributionLedgerRow } from "./columns"
import { ContributionsEmptyState } from "./empty-states"
import { ContributionsTableHeader } from "./table-header"

export function ContributionsDataTable({
  items,
}: {
  items: ContributionLedgerRow[]
}) {
  if (!items.length) {
    return <ContributionsEmptyState />
  }

  return (
    <DashboardDataTable>
      <DashboardTable>
        <ContributionsTableHeader />
        <DashboardTableBody>
          {items.map((contribution) => (
            <DashboardTableRow key={contribution.id}>
              {contributionColumns.map((column) => (
                <DashboardTableCell key={column.key} align={column.align}>
                  {column.render(contribution)}
                </DashboardTableCell>
              ))}
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}
