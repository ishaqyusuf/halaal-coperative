"use client"

import { ViewTabs } from "@/components/view-tabs"
import {
  type BusinessPageView,
  useBusinessPageParams,
} from "@/hooks/use-business-page-params"

const views: Array<{ label: string; value: BusinessPageView }> = [
  { label: "Businesses", value: "businesses" },
  { label: "Profit sharing", value: "seasons" },
]

export function BusinessViewTabs({
  activeView,
}: {
  activeView: BusinessPageView
}) {
  const { setParams } = useBusinessPageParams()

  return (
    <ViewTabs
      ariaLabel="Business"
      className="overflow-x-auto border-b border-border"
      idPrefix="business"
      items={views}
      onValueChange={(view) => void setParams({ view })}
      panelId="business-active-view"
      value={activeView}
    />
  )
}
