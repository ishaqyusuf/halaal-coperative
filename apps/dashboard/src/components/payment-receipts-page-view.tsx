import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  MemberPaymentReceiptsView,
  PaymentReceiptsView,
} from "@/components/payment-receipts-view"
import type { loadPaymentReceiptsPageData } from "@/lib/payment-receipts/load-payment-receipts-page"
import type { TableSettings } from "@/utils/table-settings"

type PaymentReceiptsPageData = Awaited<
  ReturnType<typeof loadPaymentReceiptsPageData>
>

export function PaymentReceiptsPageView({
  data,
  paymentReceiptsInitialSettings,
}: {
  data: PaymentReceiptsPageData
  paymentReceiptsInitialSettings?: Partial<TableSettings>
}) {
  if (data.state === "restricted") {
    return (
      <WorkspacePageShell
        description="Receipt review is available to cooperative staff."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Your current role does not include access to receipt review."
          title="Receipt workspace unavailable"
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        description="Stage transfer proofs and review allocation before posting."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, receipt submissions and review status will appear here."
          title="Receipt review is waiting for the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-sign-in-required") {
    return (
      <WorkspacePageShell
        description="Submit transfer proofs and track finance review status."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to submit and track payment receipts."
          title="Member sign-in required."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspacePageShell
        description="Submit transfer proofs and track finance review status."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <WorkspaceEmptyState
          body="Your user account is not linked to a member profile in this cooperative."
          title="Member profile not linked."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Submit transfer proofs and track finance review status."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <MemberPaymentReceiptsView
          canCreateReceipt={data.canCreateReceipt}
          categoryOptions={data.categoryOptions}
          commitmentPlans={data.commitmentPlans}
          foodPurchaseApplications={data.foodPurchaseApplications}
          initialSettings={paymentReceiptsInitialSettings}
          loans={data.loans}
          member={data.member}
          procurementSchedules={data.procurementSchedules}
          projectFinancingRequests={data.projectFinancingRequests}
          receipts={data.receipts}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      description="Review staged transfer proofs, allocate payments by category and period, then post supported savings and loan-servicing rows through the existing ledgers."
      eyebrow="Payments"
      title="Payment receipts"
    >
      <PaymentReceiptsView
        categoryOptions={data.categoryOptions}
        commitmentPlans={data.commitmentPlans}
        foodPurchaseApplications={data.foodPurchaseApplications}
        loans={data.loans}
        members={data.members}
        initialSettings={paymentReceiptsInitialSettings}
        procurementSchedules={data.procurementSchedules}
        projectFinancingRequests={data.projectFinancingRequests}
        receipts={data.receipts}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
