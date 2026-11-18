import { MemberServiceRequestScreen, projectFinancingAdapter } from "@/features/member-service-requests/public/member-service-request"

export function MemberProjectFinancingRouteController() {
  return <MemberServiceRequestScreen adapter={projectFinancingAdapter} />
}
