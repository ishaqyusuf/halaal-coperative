import {
  buildMembersPath,
  type MemberFilterValues,
} from "@/lib/members/member-filters"
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
      href={buildMembersPath({
        ...filters,
        migrationStatus: "",
        status: "",
      })}
      label="Members"
      value={totalCount.toString()}
    />
  )
}
