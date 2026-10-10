"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export type ChargeView = "applications" | "definitions"

const views: Array<{
  description: string
  label: string
  value: ChargeView
}> = [
  {
    description: "Reusable charge rules and dated amounts",
    label: "Definitions",
    value: "definitions",
  },
  {
    description: "Charges posted to cooperative members",
    label: "Applications",
    value: "applications",
  },
]

export function ChargeViewTabs({ activeView }: { activeView: ChargeView }) {
  const { setFilter } = useChargeFilterParams()
  const { setParams: setSortParams } = useSortParams()

  async function selectView(view: ChargeView) {
    await setSortParams({ sort: null })
    await setFilter(
      {
        frequency: null,
        q: null,
        status: null,
        valueType: null,
        view,
      },
      { shallow: false }
    )
  }

  return (
    <div
      aria-label="Charge workspace view"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls="charges-active-view"
            aria-selected={selected}
            className="h-11 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 text-sm data-[active=true]:border-primary data-[active=true]:bg-transparent"
            data-active={selected}
            id={`charges-${view.value}-tab`}
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
