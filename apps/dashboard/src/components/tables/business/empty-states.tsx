export function BusinessEmptyState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No businesses have been recorded yet.
    </div>
  )
}

export function BusinessNoResults() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No businesses match the current filters.
    </div>
  )
}
