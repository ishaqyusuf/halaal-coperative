import { FinanceSettingsSkeleton } from "@/components/finance-settings-page-states"
import { routeLoadingMarkerAttribute } from "@/lib/navigation/deep-link-sheets"

export default function FinanceSettingsLoading() {
  return (
    <>
      <span hidden {...{ [routeLoadingMarkerAttribute]: "" }} />
      <FinanceSettingsSkeleton />
    </>
  )
}
