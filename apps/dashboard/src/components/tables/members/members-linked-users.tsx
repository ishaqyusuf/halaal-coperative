import { MembersSummaryCard } from "./members-summary-card"

export function MembersLinkedUsers({
  linkedUsersCount,
}: {
  linkedUsersCount: number
}) {
  return (
    <MembersSummaryCard
      detail="Members already connected to a user account."
      label="Linked users"
      value={linkedUsersCount.toString()}
    />
  )
}
