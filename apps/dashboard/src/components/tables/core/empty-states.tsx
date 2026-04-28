export function TableEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-card px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export function TableNoResults({ body }: { body: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-card px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No matching rows</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
