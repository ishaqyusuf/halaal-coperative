import { EmptyState } from "@/components/tables/core"

export function ContributionsEmptyState() {
  return (
    <EmptyState
      description="Posted member payments will appear here once the cooperative starts recording contribution entries."
      title="No contribution activity yet"
    />
  )
}
