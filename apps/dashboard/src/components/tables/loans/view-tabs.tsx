"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

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
    <div
      aria-label="Loan workspace view"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls="loans-active-view"
            aria-selected={selected}
            className="h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 text-base data-[active=true]:border-primary data-[active=true]:bg-transparent data-[active=true]:font-semibold"
            data-active={selected}
            id={`loans-${view.value}-tab`}
            key={view.value}
            onClick={() => void selectView(view.value)}
            role="tab"
            type="button"
            variant="ghost"
          >
            {isMemberView ? view.memberLabel : view.label}
          </Button>
        )
      })}
    </div>
  )
}
