"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
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
    <div
      aria-label="Charges"
      className="flex min-w-0 gap-x-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            aria-controls="charges-active-view"
            aria-selected={selected}
            className={cn(
              "h-11 shrink-0 rounded-none border-b-2 px-3 text-base shadow-none",
              selected
                ? "border-b-foreground font-semibold text-foreground"
                : "border-transparent text-muted-foreground"
            )}
            id={`charges-${view.value}-tab`}
            key={view.value}
            onClick={() =>
              void setParams(
                { chargedQ: null, view: view.value },
                { shallow: false }
              )
            }
            role="tab"
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
