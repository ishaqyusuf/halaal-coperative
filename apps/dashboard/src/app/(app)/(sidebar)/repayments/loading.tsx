import { WorkspacePageShell } from "@/components/dashboard"
import { RepaymentsSkeleton } from "@/components/tables/repayments/skeleton"

export default function RepaymentsLoading() {
  return (
    <WorkspacePageShell
      description="Loading repayment servicing, collection follow-up, and posted evidence."
      eyebrow="Repayments"
      title="Repayment tracking"
    >
      <RepaymentsSkeleton />
    </WorkspacePageShell>
  )
}
