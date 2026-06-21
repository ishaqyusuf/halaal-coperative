export function EmptyState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center border border-t-0 border-border text-center">
      <p className="text-sm text-muted-foreground">
        No share structure history has been recorded.
      </p>
    </div>
  )
}

export function NoResults() {
  return (
    <div className="flex min-h-[300px] items-center justify-center border border-t-0 border-border text-center">
      <p className="text-sm text-muted-foreground">
        No share structure rows match this search.
      </p>
    </div>
  )
}
