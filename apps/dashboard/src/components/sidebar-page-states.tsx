import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { DashboardPageShell } from "@/components/dashboard"

// Generic route skeleton for sidebar pages without their own `loading.tsx`:
// page header, toolbar, KPI strip and table rows.
export function SidebarPageSkeleton() {
  return (
    <DashboardPageShell>
      <div
        aria-label="Loading page"
        className="min-w-0 space-y-6"
        role="status"
      >
        <section className="border-b border-border pb-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        </section>

        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-11 w-full max-w-sm md:h-9" />
          <Skeleton className="h-11 w-28 shrink-0 md:h-9" />
        </div>

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

        <section className="divide-y divide-border border border-border bg-background">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="flex min-h-14 items-center justify-between gap-4 px-3 py-3"
              key={index}
            >
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="mt-2 hidden h-3 w-2/5 md:block" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </section>
      </div>
    </DashboardPageShell>
  )
}
