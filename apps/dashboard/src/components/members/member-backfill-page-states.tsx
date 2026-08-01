import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  DashboardPageShell,
  DashboardSectionCard,
} from "@/components/dashboard"

function FormFieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-11 w-full md:h-8" />
    </div>
  )
}

export function MemberBackfillSkeleton() {
  return (
    <DashboardPageShell>
      <div
        aria-label="Loading member migration"
        className="space-y-6"
        role="status"
      >
        <section className="border-b border-border/70 pb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-56 max-w-full" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-2xl" />
        </section>

        <div className="grid gap-2 sm:flex sm:items-center">
          <Skeleton className="h-11 w-full sm:w-32 md:h-9" />
          <Skeleton className="h-11 w-full sm:w-40 md:h-9" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="flex gap-2 overflow-hidden xl:hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-16 min-w-36" key={index} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <DashboardSectionCard className="hidden p-3 xl:block">
            <Skeleton className="h-3 w-24" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton className="h-16 w-full" key={index} />
              ))}
            </div>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-6 w-64 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <FormFieldSkeleton key={index} />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Skeleton className="h-11 w-40 md:h-8" />
            </div>
          </DashboardSectionCard>
        </div>
      </div>
    </DashboardPageShell>
  )
}
