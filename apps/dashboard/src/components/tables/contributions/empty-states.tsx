"use client"

import { EmptyState } from "@/components/tables/core"

export function ContributionsEmptyState({
  filtered = false,
}: {
  filtered?: boolean
}) {
  if (filtered) {
    return (
      <EmptyState
        description="Adjust or clear the active filters from the toolbar."
        title="No matching contribution activity"
      />
    )
  }

  return (
    <EmptyState
      description="Posted member payments will appear here once the cooperative starts recording contribution entries."
      title="No contribution activity yet"
    />
  )
}
