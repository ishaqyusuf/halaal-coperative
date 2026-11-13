import { SidebarPageSkeleton } from "@/components/sidebar-page-states"
import { routeLoadingMarkerAttribute } from "@/lib/navigation/deep-link-sheets"

export default function LoansLoading() {
  return (
    <>
      <span hidden {...{ [routeLoadingMarkerAttribute]: "" }} />
      <SidebarPageSkeleton />
    </>
  )
}
