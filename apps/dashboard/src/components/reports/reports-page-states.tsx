import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { DashboardPageShell } from "@/components/dashboard"

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="min-w-0 border border-border bg-background p-4 sm:p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-5 w-44 max-w-full" />
      <div className="mt-5 divide-y divide-border border border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex min-h-14 items-center justify-between gap-4 px-3 py-3"
            key={index}
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 hidden h-3 w-4/5 md:block" />
            </div>
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ReportsPageSkeleton() {
  return (
    <DashboardPageShell>
      <div
        aria-label="Loading reports"
        className="min-w-0 space-y-6"
        role="status"
      >
        <section className="border-b border-border pb-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-xl" />
        </section>

        <Skeleton className="h-11 w-28 md:h-9" />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="min-h-[112px] border border-border bg-background p-4"
              key={index}
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-5 h-7 w-20" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-3">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </section>
      </div>
    </DashboardPageShell>
  )
}
