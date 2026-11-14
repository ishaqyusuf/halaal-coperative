import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SummaryCardSkeleton } from "@/components/summary-card"

function OverviewListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="rounded-(--ui-radius-surface) border border-border bg-card p-5">
      <Skeleton className="h-6 w-48" />
      <div className="mt-3 divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex min-h-14 items-center gap-4 py-2" key={index}>
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-6 w-72" />
        </div>
        <Skeleton className="h-11 w-40" />
      </section>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <OverviewListSkeleton />
        <OverviewListSkeleton rows={2} />
      </div>
      <OverviewListSkeleton rows={4} />
    </div>
  )
}
