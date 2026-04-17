import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { LoansPageView } from "@/components/tables/loans"
import { loadLoansPageData } from "@/lib/loans"

export default async function LoansPage() {
  const data = await loadLoansPageData()

  if (data.state !== "ready") {
    return (
      <WorkspacePageShell eyebrow="Loans" title="Loan operations" description="The loan workspace is staged for request review, approval sequencing, and liquidity-aware disbursement.">
        <WorkspaceEmptyState title="Loan workflows need the database runtime." body="Once the database-backed environment is active, this route will manage requests, approvals, disbursement, and repayment setup." />
      </WorkspacePageShell>
    )
  }

  return <LoansPageView {...data} />
}
