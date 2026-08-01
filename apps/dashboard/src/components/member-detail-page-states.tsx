import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  DashboardPageShell,
  DashboardSectionCard,
} from "@/components/dashboard"

export function MemberDetailSkeleton() {
  return (
    <DashboardPageShell>
      <div
        aria-label="Loading member details"
        className="space-y-6"
        role="status"
      >
        <section className="border-b border-border/70 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-8 w-56 max-w-full" />
              <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
              <Skeleton className="mt-2 h-4 w-4/5 max-w-xl" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1 sm:h-9 sm:w-36 sm:flex-none" />
              <Skeleton className="size-11 shrink-0 sm:h-9 sm:w-28" />
            </div>
          </div>
        </section>

        <DashboardSectionCard className="border-amber-200">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-3 w-full max-w-xl" />
          <Skeleton className="mt-2 h-3 w-3/4 max-w-lg" />
        </DashboardSectionCard>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <DashboardSectionCard key={index}>
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="mt-4 h-7 w-20" />
              <Skeleton className="mt-3 h-3 w-full" />
            </DashboardSectionCard>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          {Array.from({ length: 2 }, (_, index) => (
            <DashboardSectionCard key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-5 w-56 max-w-full" />
              <div className="mt-6 grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }, (_, itemIndex) => (
                  <div key={itemIndex}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                ))}
              </div>
            </DashboardSectionCard>
          ))}
        </section>
      </div>
    </DashboardPageShell>
  )
}
