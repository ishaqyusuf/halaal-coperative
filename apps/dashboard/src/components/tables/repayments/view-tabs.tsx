"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import type { RepaymentView } from "./types"

const views: Array<{
  description: string
  label: string
  value: RepaymentView
}> = [
  {
    description: "Overdue accounts needing follow-up",
    label: "Collections",
    value: "collections",
  },
  {
    description: "Every due and completed installment",
    label: "Schedule",
    value: "schedule",
  },
  {
    description: "Posted and reversed payment records",
    label: "History",
    value: "history",
  },
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
    <div
      aria-label="Repayment workspace view"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls="repayments-active-view"
            aria-selected={selected}
            className="h-11 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 text-sm data-[active=true]:border-primary data-[active=true]:bg-transparent"
            data-active={selected}
            id={`repayments-${view.value}-tab`}
            key={view.value}
            onClick={() => void selectView(view.value)}
            role="tab"
            title={view.description}
            type="button"
            variant="ghost"
          >
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}
