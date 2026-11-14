import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SummaryCardSkeleton } from "@/components/summary-card"

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {Array.from({ length: rows }, (_, index) => (
        <li
          className="flex min-h-14 items-center gap-3 px-1 py-3 sm:px-3"
          key={index}
        >
          <span className="min-w-0 flex-1">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          </span>
          <Skeleton className="size-5" />
        </li>
      ))}
    </ul>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div
      aria-label="Loading reports"
      className="grid min-w-0 gap-10"
      role="status"
    >
      <section className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="h-11 w-28" key={index} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SummaryCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
          <ListSkeleton rows={4} />
          <ListSkeleton rows={4} />
        </div>
      </section>
    </div>
  )
}
