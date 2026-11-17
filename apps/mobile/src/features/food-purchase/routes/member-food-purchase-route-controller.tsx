import { MemberServiceRequestScreen, foodPurchaseAdapter } from "@/features/member-service-requests/public/member-service-request"

export function MemberFoodPurchaseRouteController() {
  return <MemberServiceRequestScreen adapter={foodPurchaseAdapter} />
}
