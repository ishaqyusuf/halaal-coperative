"use client"

import type { ReactNode } from "react"
import { ShareApplicationColumnVisibility } from "@/components/share-application-column-visibility"
import { ShareApplicationSearchFilter } from "@/components/share-application-search-filter"

export function ShareApplicationHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description?: string
  title?: string
}) {
  return (
    <>
      <div className="hidden items-center justify-between border-b border-border bg-background px-4 py-3 md:flex">
        <ShareApplicationSearchFilter />
        <div className="flex items-center gap-2">
          <ShareApplicationColumnVisibility />
          {action}
        </div>
      </div>
      {title || description ? (
        <div className="border-b border-border bg-background px-4 py-3">
          {title ? (
            <p className="text-sm font-medium text-foreground">{title}</p>
          ) : null}
          {description ? (
            <p className={title ? "mt-1 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
