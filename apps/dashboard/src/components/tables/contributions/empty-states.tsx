import { TableEmptyState } from "@/components/tables/core"

export function ContributionsEmptyState() {
  return (
    <TableEmptyState
      title="No contribution activity yet"
      body="Posted member payments will appear here once the cooperative starts recording contribution entries."
    />
  )
}
