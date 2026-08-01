import { MembersSummaryCard } from "./members-summary-card"

export function MembersKycPending({
  kycPendingCount,
}: {
  kycPendingCount: number
}) {
  return (
    <MembersSummaryCard
      detail="Members still needing KYC attention."
      label="KYC attention"
      tone={kycPendingCount ? "warning" : "positive"}
      value={kycPendingCount.toString()}
    />
  )
}
