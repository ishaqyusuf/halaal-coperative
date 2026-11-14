import { WorkspacePageShell } from "@/components/dashboard"
import {
  FoodPurchaseView,
  MemberFoodPurchaseView,
} from "@/components/food-purchase-view"
import {
  isRequestPageBlocked,
  RequestPageState,
} from "@/components/requests/request-page-state"
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
  if (isRequestPageBlocked(data.state)) {
    return <RequestPageState state={data.state} title="Foodstuff purchase" />
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Ask for foodstuff each month. Pay it back monthly."
        eyebrow="Foodstuff purchase"
        title="Foodstuff purchase"
      >
        <MemberFoodPurchaseView
          canCreateApplication={data.canCreateApplication}
          cycles={data.cycles}
          initialSettings={foodPurchaseInitialSettings}
          needsVerification={data.needsVerification}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "staff-ready") return null

  return (
    <WorkspacePageShell
      description="Monthly bulk food for members, paid back monthly."
      eyebrow="Foodstuff purchase"
      title="Foodstuff purchase"
    >
      <FoodPurchaseView
        canRecordAccounting={data.canRecordAccounting}
        canReleaseFunds={data.canReleaseFunds}
        canReviewAccounting={data.canReviewAccounting}
        canReviewApplications={data.canReviewApplications}
        canSubmitApplications={data.canSubmitApplications}
        cycles={data.cycles}
        initialSettings={foodPurchaseInitialSettings}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
