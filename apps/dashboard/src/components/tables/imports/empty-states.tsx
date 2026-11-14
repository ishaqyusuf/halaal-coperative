import type { ReactNode } from "react"

export function ImportEmptyState({
  action,
  description,
  title = "Nothing added from a spreadsheet yet.",
}: {
  action?: ReactNode
  description?: string
  title?: string
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-4 border-y text-center text-base text-muted-foreground">
      <div className="max-w-lg space-y-1 px-4">
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="leading-6">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ImportNoResults() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      Nothing matches. Clear the search to see every import.
    </div>
  )
}
