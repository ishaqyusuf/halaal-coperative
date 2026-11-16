"use client"

import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { ViewTabs } from "@/components/view-tabs"

export type LoanView = "portfolio" | "requests"

const views: Array<{ label: string; memberLabel: string; value: LoanView }> = [
  { label: "Requests", memberLabel: "My requests", value: "requests" },
  { label: "Loans", memberLabel: "My loans", value: "portfolio" },
]

export function LoanViewTabs({
  activeView,
  isMemberView = false,
}: {
  activeView: LoanView
  isMemberView?: boolean
}) {
  const { setFilter } = useLoanFilterParams()
  const { setParams: setSortParams } = useSortParams()

  async function selectView(view: LoanView) {
    await setSortParams({ sort: null })
    await setFilter(
      {
        portfolioStatus: null,
        requestStatus: null,
        view,
      },
      { shallow: false }
    )
  }

  return (
    <ViewTabs
      ariaLabel="Loan workspace view"
      className="overflow-x-auto border-b border-border"
      idPrefix="loans"
      items={views.map((view) => ({
        label: isMemberView ? view.memberLabel : view.label,
        value: view.value,
      }))}
      look="tall"
      onValueChange={(view) => void selectView(view)}
      panelId="loans-active-view"
      value={activeView}
    />
  )
}
