"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
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
    <div
      aria-label="Business"
      className="flex min-w-0 gap-x-1 overflow-x-auto border-b border-border"
      role="tablist"
    >
      {views.map((view) => {
        const selected = view.value === activeView

        return (
          <Button
            size="touch"
            aria-controls="business-active-view"
            aria-selected={selected}
            className={cn(
              "shrink-0 rounded-none border-b-2 px-3 text-base shadow-none",
              selected
                ? "border-b-foreground font-semibold text-foreground"
                : "border-transparent text-muted-foreground"
            )}
            id={`business-${view.value}-tab`}
            key={view.value}
            onClick={() => void setParams({ view: view.value })}
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
