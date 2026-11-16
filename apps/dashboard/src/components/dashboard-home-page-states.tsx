import { OverviewSkeleton } from "@/components/widgets/overview-skeleton"

// Home's route skeleton. The `(sidebar)` layout already draws the shell, so
// this is only the overview body (the same fallback the page's Suspense uses).
export function DashboardHomeSkeleton() {
  return (
    <div aria-label="Loading dashboard overview" role="status">
      <OverviewSkeleton />
    </div>
  )
}
