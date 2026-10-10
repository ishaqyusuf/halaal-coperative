"use client"

import { Button } from "@halaalvest/ui/components/button"
import type { ReactNode } from "react"
import {
  clearedSupportFilters,
  useSupportFilterParams,
} from "@/hooks/use-support-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function SupportEmptyState({ mode }: { mode: "member" | "staff" }) {
  return (
    <SupportState
      description={
        mode === "member"
          ? "Open a case when you need help with a payment, account update, or cooperative service."
          : "Open a case to track a member issue, assignment, conversation, and resolution evidence."
      }
      title="No support cases yet."
    />
  )
}

export function SupportNoResults() {
  const { setFilter } = useSupportFilterParams()
  const { setParams } = useSortParams()

  return (
    <SupportState
      action={
        <Button
          className="h-11"
          onClick={() => {
            void Promise.all([
              setFilter(clearedSupportFilters),
              setParams({ sort: null }),
            ])
          }}
          type="button"
          variant="outline"
        >
          Clear filters
        </Button>
      }
      description="Clear the current support filters or try a different search."
      title="No support cases match."
    />
  )
}

function SupportState({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center border-y border-border px-4 py-12 text-center md:border-x-0 md:border-t-0">
      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
    </div>
  )
}
