import { Badge } from "@halaal-vest/ui/components/badge"

export function WorkspacePageShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/70 bg-background/90 p-6 shadow-sm">
        <Badge variant="outline">{eyebrow}</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function WorkspaceEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-background/80 p-8 text-center shadow-sm">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
    </div>
  )
}
