import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { DashboardPageFrame } from "@/components/dashboard"
import { OverviewSkeleton } from "@/components/widgets/overview-skeleton"

export function DashboardHomeSkeleton() {
  return (
    <div
      aria-label="Loading dashboard overview"
      className="min-h-svh bg-background"
      role="status"
    >
      <aside className="fixed inset-y-0 left-0 hidden w-[70px] flex-col items-center border-r border-border bg-background py-4 md:flex">
        <Skeleton className="size-9 rounded-lg" />
        <div className="mt-8 flex flex-col gap-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton className="size-8 rounded-md" key={index} />
          ))}
        </div>
      </aside>

      <div className="md:pl-[70px]">
        <header className="flex h-[70px] items-center gap-3 border-b border-border px-4 sm:px-6 lg:px-8">
          <Skeleton className="size-8 rounded-full md:hidden" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="mt-2 h-7 w-44 max-w-full" />
          </div>
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </header>

        <DashboardPageFrame>
          <OverviewSkeleton />
        </DashboardPageFrame>
      </div>
    </div>
  )
}
