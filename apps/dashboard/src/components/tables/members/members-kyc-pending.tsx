import { buildMembersPath, type MemberFilterValues } from "@/lib/members/member-filters"
import { MembersSummaryCard } from "./members-summary-card"

export function MembersKycPending({
  filters,
  kycPendingCount,
}: {
  filters: MemberFilterValues
  kycPendingCount: number
}) {
  return (
    <MembersSummaryCard
      detail="Members still needing KYC attention."
      href={buildMembersPath({ ...filters, kycStatus: "pending" })}
      label="KYC pending"
      tone={kycPendingCount ? "warning" : "positive"}
      value={kycPendingCount.toString()}
    />
  )
}
