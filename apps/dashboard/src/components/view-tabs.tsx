"use client"

import { Tabs, TabsList, TabsTrigger } from "@halaalvest/ui/components/tabs"
import { cn } from "@halaalvest/ui/lib/utils"
import type { ReactNode } from "react"

export type ViewTabItem<T extends string> = {
  label: ReactNode
  value: T
}

// The primitive's pill look is reset to the dashboard's underlined page
// tabs. Dark-mode resets matter: the primitive borders and fills the active
// trigger there.
const listClassName =
  "flex h-auto w-full min-w-0 justify-start gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto"
const triggerBase =
  "h-11 flex-none shrink-0 rounded-none border-0 border-b-2 border-transparent py-0 text-base font-medium shadow-none after:hidden hover:text-foreground data-active:border-transparent data-active:bg-transparent data-active:font-semibold dark:data-active:border-transparent dark:data-active:bg-transparent"
const looks = {
  // 44px, a foreground underline (settings-style section tabs).
  default:
    "px-3 text-muted-foreground data-active:border-b-foreground data-active:text-foreground dark:text-muted-foreground dark:data-active:border-b-foreground",
  // 48px, a primary underline (workspace views: loans, repayments, food).
  tall: "h-12 px-4 text-foreground data-active:border-b-primary data-active:text-foreground dark:text-foreground dark:data-active:border-b-primary",
} as const

/**
 * Page view tabs on the shared Tabs primitive (WP18): roving focus and arrow
 * keys come from Base UI. The page keeps its own panel element, so each
 * trigger takes a stable id (`${idPrefix}-${value}-tab`) and the panel id.
 */
export function ViewTabs<T extends string>({
  ariaLabel,
  className,
  idPrefix,
  items,
  look = "default",
  onValueChange,
  panelId,
  value,
}: {
  ariaLabel?: string
  className?: string
  idPrefix: string
  items: ReadonlyArray<ViewTabItem<T>>
  look?: keyof typeof looks
  onValueChange: (value: T) => void
  panelId: string | ((value: T) => string)
  value: T
}) {
  return (
    <Tabs
      className="min-w-0 gap-0"
      onValueChange={(next) => onValueChange(next as T)}
      value={value}
    >
      <TabsList aria-label={ariaLabel} className={cn(listClassName, className)}>
        {items.map((item) => (
          <TabsTrigger
            aria-controls={
              typeof panelId === "function" ? panelId(item.value) : panelId
            }
            className={cn(triggerBase, looks[look])}
            id={`${idPrefix}-${item.value}-tab`}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
