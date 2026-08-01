import { Skeleton } from "@halaalvest/ui/components/skeleton"

function OverviewSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="border border-border bg-background p-4 sm:p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-5 w-40" />
      <Skeleton className="mt-3 h-3 w-full max-w-sm" />
      <div className="mt-5 divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex items-center justify-between gap-4 py-3"
            key={index}
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <section className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-72 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-32 md:h-7" />
            <Skeleton className="h-11 w-32 md:h-7" />
          </div>
        </div>
      </section>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="min-h-[112px] border border-border bg-background p-4"
            key={index}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-5 h-7 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <OverviewSectionSkeleton rows={4} />
        <OverviewSectionSkeleton />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <OverviewSectionSkeleton />
        <OverviewSectionSkeleton />
        <OverviewSectionSkeleton />
      </section>
    </div>
  )
}
