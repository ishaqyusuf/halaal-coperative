import type { ReactNode } from "react"

export function ImportEmptyState({
  action,
  description,
  title = "No import batches yet.",
}: {
  action?: ReactNode
  description?: string
  title?: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 border-t text-center text-sm text-muted-foreground">
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
      No import batches match the current filters.
    </div>
  )
}
