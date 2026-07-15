import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  FoodPurchaseView,
  MemberFoodPurchaseView,
} from "@/components/food-purchase-view"
import type { loadFoodPurchasePageData } from "@/lib/food-purchase/load-food-purchase-page"
import type { TableSettings } from "@/utils/table-settings"

type FoodPurchasePageData = Awaited<ReturnType<typeof loadFoodPurchasePageData>>

export function FoodPurchasePageView({
  data,
  foodPurchaseInitialSettings,
}: {
  data: FoodPurchasePageData
  foodPurchaseInitialSettings?: Partial<TableSettings>
}) {
  if (data.state === "restricted") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="Foodstuff Purchase"
        description="Track monthly committee funds, member applications, approvals, and accounting."
      >
        <WorkspaceEmptyState
          body="Foodstuff Purchase is available to cooperative staff and linked members."
          title="Foodstuff Purchase access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="Foodstuff Purchase"
        description="Track monthly committee funds, member applications, approvals, and accounting."
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show Foodstuff Purchase cycles, applications, reviews, and accounting."
          title="Foodstuff Purchase needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "service-disabled") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="Foodstuff Purchase"
        description="Track monthly committee funds, member applications, approvals, and accounting."
      >
        <WorkspaceEmptyState
          body="This cooperative has not enabled Foodstuff Purchase. Admins can enable it from Settings > Operation Profile."
          title="Foodstuff Purchase is not enabled."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-sign-in-required") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="My Foodstuff Purchase"
        description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to apply for Foodstuff Purchase."
          title="Member sign-in required."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="My Foodstuff Purchase"
        description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
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
        eyebrow="Foodstuff Purchase"
        title="My Foodstuff Purchase"
        description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
      >
        <MemberFoodPurchaseView
          applications={data.applications}
          canCreateApplication={data.canCreateApplication}
          chargeOptions={data.chargeOptions}
          cycles={data.cycles}
          initialSettings={foodPurchaseInitialSettings}
          member={data.member}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      eyebrow="Foodstuff Purchase"
      title="Foodstuff Purchase"
      description="Manage committee fund releases, member Foodstuff Purchase applications, and month-end accounting."
    >
      <FoodPurchaseView
        applications={data.applications}
        approvalChargeOptions={data.approvalChargeOptions}
        canRecordAccounting={data.canRecordAccounting}
        canReleaseFunds={data.canReleaseFunds}
        canReviewAccounting={data.canReviewAccounting}
        canReviewApplications={data.canReviewApplications}
        canSubmitApplications={data.canSubmitApplications}
        cycles={data.cycles}
        initialSettings={foodPurchaseInitialSettings}
        memberOptions={data.memberOptions}
        submissionChargeOptions={data.submissionChargeOptions}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
