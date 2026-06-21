export function EmptyState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No charge definitions have been created yet.
    </div>
  )
}

export function NoResults() {
  return (
    <div className="flex min-h-[220px] items-center justify-center border-t text-sm text-muted-foreground">
      No charges match the current filters.
    </div>
  )
}
