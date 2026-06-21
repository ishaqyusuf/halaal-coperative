export function EmptyState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No historical businesses have been recorded yet.
    </div>
  )
}

export function NoResults() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No businesses match the current filters.
    </div>
  )
}
