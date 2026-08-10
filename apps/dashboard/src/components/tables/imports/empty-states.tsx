import type { ReactNode } from "react"

export function ImportEmptyState({
  action,
  title = "No import batches yet.",
}: {
  action?: ReactNode
  title?: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 border-t text-center text-sm text-muted-foreground">
      <p>{title}</p>
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
