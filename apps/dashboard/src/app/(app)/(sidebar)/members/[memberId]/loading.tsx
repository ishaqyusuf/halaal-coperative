import { MemberDetailSkeleton } from "@/components/member-detail-page-states"
import { routeLoadingMarkerAttribute } from "@/lib/navigation/deep-link-sheets"

export default function MemberDetailLoading() {
  return (
    <>
      <span hidden {...{ [routeLoadingMarkerAttribute]: "" }} />
      <MemberDetailSkeleton />
    </>
  )
}
