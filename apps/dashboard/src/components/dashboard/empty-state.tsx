import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@halaalvest/ui/components/empty"
import { DashboardSectionCard } from "./section"

export function DashboardEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  // The shared Empty primitive inside the dashboard card (WP18), keeping
  // the heading element and the old spacing.
  return (
    <DashboardSectionCard className="border-dashed bg-background/80 p-8 text-center">
      <Empty className="flex-none p-0 text-wrap">
        <EmptyHeader className="max-w-2xl gap-3">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <EmptyDescription className="text-sm leading-7">
            {body}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </DashboardSectionCard>
  )
}
