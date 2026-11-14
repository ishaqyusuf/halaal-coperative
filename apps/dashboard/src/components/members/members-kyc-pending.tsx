import { MembersSummaryCard } from "./members-summary-card"

export function MembersKycPending({
  kycPendingCount,
}: {
  kycPendingCount: number
}) {
  return (
    <MembersSummaryCard
      label="Need KYC"
      tone={kycPendingCount ? "warning" : "positive"}
      value={kycPendingCount.toString()}
    />
  )
}
