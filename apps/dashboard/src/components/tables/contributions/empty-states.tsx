import { TableEmptyState } from "@/components/dashboard/static-table"

export function ContributionsEmptyState() {
  return (
    <TableEmptyState
      title="No contribution activity yet"
      body="Posted member payments will appear here once the cooperative starts recording contribution entries."
    />
  )
}
