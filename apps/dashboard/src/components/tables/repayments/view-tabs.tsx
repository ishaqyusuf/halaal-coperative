"use client"

import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import type { RepaymentView } from "./types"
import { ViewTabs } from "@/components/view-tabs"

const views: Array<{ label: string; value: RepaymentView }> = [
  { label: "Late", value: "collections" },
  { label: "All payments due", value: "schedule" },
  { label: "Received", value: "history" },
]

export function RepaymentViewTabs({
  activeView,
}: {
  activeView: RepaymentView
}) {
  const { setFilters } = useRepaymentsFilterParams()
  const { setParams: setSortParams } = useSortParams()

  async function selectView(view: RepaymentView) {
    const filtersByView =
      view === "collections"
        ? {
            repaymentStatus: null,
            scheduleStatus: null,
            view,
          }
        : view === "schedule"
          ? {
              assignedToUserId: null,
              repaymentStatus: null,
              resolutionStatus: null,
              stage: null,
              view,
            }
          : {
              assignedToUserId: null,
              repaymentStatus: null,
              resolutionStatus: null,
              scheduleStatus: null,
              stage: null,
              view,
            }

    await setSortParams({ sort: null })
    await setFilters(filtersByView, { shallow: false })
  }

  return (
    <ViewTabs
      ariaLabel="Repayment workspace view"
      className="overflow-x-auto border-b border-border"
      idPrefix="repayments"
      items={views}
      look="tall"
      onValueChange={(view) => void selectView(view)}
      panelId="repayments-active-view"
      value={activeView}
    />
  )
}
