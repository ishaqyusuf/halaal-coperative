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
        description="Payment proofs from members."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Ask a cooperative admin or finance officer for access."
          title="You don't have access to receipts"
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        description="Payment proofs from members."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Receipts are not available right now. Try again later."
          title="Not available"
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-sign-in-required") {
    return (
      <WorkspacePageShell
        description="Send payment proof and see when it is approved."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to send receipts."
          title="Please sign in"
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspacePageShell
        description="Send payment proof and see when it is approved."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <WorkspaceEmptyState
          body="Your account is not linked to a member here. Contact your cooperative."
          title="No member profile"
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Send payment proof and see when it is approved."
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
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      description="Check members' payment proofs and approve them."
      eyebrow="Payments"
      title="Payment receipts"
    >
      <PaymentReceiptsView
        canCreateReceipt={data.canCreateReceipt}
        categoryOptions={data.categoryOptions}
        initialSettings={paymentReceiptsInitialSettings}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
