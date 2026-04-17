import { DashboardSectionCard } from "./section"

export function DashboardEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <DashboardSectionCard className="border-dashed bg-background/80 p-8 text-center">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        {body}
      </p>
    </DashboardSectionCard>
  )
}
