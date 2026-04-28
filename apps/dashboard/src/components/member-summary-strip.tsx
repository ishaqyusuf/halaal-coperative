import { DashboardStatCard } from "@/components/dashboard"

export function MemberSummaryStrip({
  activeCount,
  kycPendingCount,
  linkedUsersCount,
  totalCount,
}: {
  activeCount: number
  kycPendingCount: number
  linkedUsersCount: number
  totalCount: number
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard label="Members" value={totalCount.toString()} detail="Registry rows returned for the current filter state." />
      <DashboardStatCard label="Active" value={activeCount.toString()} detail="Members currently active in the cooperative." tone="positive" />
      <DashboardStatCard label="KYC pending" value={kycPendingCount.toString()} detail="Members still needing KYC attention." tone={kycPendingCount ? "warning" : "positive"} />
      <DashboardStatCard label="Linked users" value={linkedUsersCount.toString()} detail="Members already connected to a user account." />
    </section>
  )
}
