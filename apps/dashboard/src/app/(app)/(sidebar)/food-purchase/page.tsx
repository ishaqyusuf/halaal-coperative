import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  FoodPurchaseView,
  MemberFoodPurchaseView,
} from "@/components/food-purchase-view"
import { loadFoodPurchasePageData } from "@/lib/food-purchase/load-food-purchase-page"

export default async function FoodPurchasePage() {
  const data = await loadFoodPurchasePageData()

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
          cycles={data.cycles}
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
        canRecordAccounting={data.canRecordAccounting}
        canReviewAccounting={data.canReviewAccounting}
        canReleaseFunds={data.canReleaseFunds}
        canReviewApplications={data.canReviewApplications}
        canSubmitApplications={data.canSubmitApplications}
        cycles={data.cycles}
        memberOptions={data.memberOptions}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
