import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
import { BusinessSkeleton } from "@/components/tables/business/skeleton"

export function BusinessUnavailableView({
  accessDenied,
}: {
  accessDenied: boolean
}) {
  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Finance
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Business
          </h1>
        </div>
        <DashboardEmptyState
          body={
            accessDenied
              ? "Business capital and profit evidence is restricted to cooperative staff."
              : "Business records could not load from the cooperative database right now."
          }
          title={
            accessDenied
              ? "Staff business access is required."
              : "Database-backed business records are not available yet."
          }
        />
      </div>
    </ScrollableContent>
  )
}

export function BusinessPageSkeleton() {
  return (
    <ScrollableContent>
      <div
        aria-label="Loading business workspace"
        className="flex flex-col gap-6"
        role="status"
      >
        <div className="hidden grid-cols-2 gap-6 pt-6 md:grid lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="min-h-28 border border-border p-4" key={index}>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="mt-3 h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-8 w-36" />
        </div>
        <div className="h-11 w-full md:h-9 md:w-80">
          <Skeleton className="size-full" />
        </div>
        <BusinessSkeleton />
      </div>
    </ScrollableContent>
  )
}
