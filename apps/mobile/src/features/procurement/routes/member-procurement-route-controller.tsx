import { MemberServiceRequestScreen, procurementAdapter } from "@/features/member-service-requests/public/member-service-request"

export function MemberProcurementRouteController() {
  return <MemberServiceRequestScreen adapter={procurementAdapter} />
}
