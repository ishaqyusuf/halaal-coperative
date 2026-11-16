"use client"

import { ViewTabs } from "@/components/view-tabs"
import {
  useChargesPageParams,
  type ChargesPageView,
} from "@/hooks/use-charges-page-params"

const views: Array<{ label: string; value: ChargesPageView }> = [
  { label: "Charge types", value: "definitions" },
  { label: "Charged to members", value: "applications" },
]

export function ChargeViewTabs({
  activeView,
}: {
  activeView: ChargesPageView
}) {
  const { setParams } = useChargesPageParams()

  return (
    <ViewTabs
      ariaLabel="Charges"
      className="overflow-x-auto border-b border-border"
      idPrefix="charges"
      items={views}
      onValueChange={(view) =>
        void setParams({ chargedQ: null, view }, { shallow: false })
      }
      panelId="charges-active-view"
      value={activeView}
    />
  )
}
