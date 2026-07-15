export function ImportEmptyState({
  title = "No import batches yet.",
}: {
  title?: string
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      {title}
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
