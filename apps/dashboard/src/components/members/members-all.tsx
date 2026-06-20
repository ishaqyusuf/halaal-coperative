import { buildMembersPath, type MemberFilterValues } from "@/lib/members/member-filters"
import { MembersSummaryCard } from "./members-summary-card"

export function MembersAll({
  filters,
  totalCount,
}: {
  filters: MemberFilterValues
  totalCount: number
}) {
  return (
    <MembersSummaryCard
      detail="Registry rows returned for the current filter state."
      href={buildMembersPath({ ...filters, status: "" })}
      label="Members"
      value={totalCount.toString()}
    />
  )
}
