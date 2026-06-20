import { buildMembersPath, type MemberFilterValues } from "@/lib/members/member-filters"
import { MembersSummaryCard } from "./members-summary-card"

export function MembersActive({
  activeCount,
  filters,
}: {
  activeCount: number
  filters: MemberFilterValues
}) {
  return (
    <MembersSummaryCard
      detail="Members currently active in the cooperative."
      href={buildMembersPath({ ...filters, status: "active" })}
      label="Active"
      tone="positive"
      value={activeCount.toString()}
    />
  )
}
