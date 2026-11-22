import { serviceLoadErrorGate } from "@halaalvest/utils/service-request-gate"
import { ShoppingBasket } from "lucide-react"
import { WorkspacePageShell } from "@/components/dashboard"
import { ServiceStateCard } from "@/components/requests/service-state-card"
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
  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        description=""
        eyebrow="Foodstuff purchase"
        title="Foodstuff purchase"
      >
        <ServiceStateCard
          gate={serviceLoadErrorGate({
            noun: "application",
            title: "Foodstuff purchase",
          })}
          serviceIcon={ShoppingBasket}
        />
      </WorkspacePageShell>
    )
  }

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
          active={data.active}
          canCreateApplication={data.canCreateApplication}
          cycles={data.cycles}
          gate={data.gate}
          initialSettings={foodPurchaseInitialSettings}
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
