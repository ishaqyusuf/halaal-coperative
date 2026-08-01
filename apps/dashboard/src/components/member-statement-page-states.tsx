import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  DashboardSectionCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"

export function MemberStatementUnavailableView() {
  return (
    <WorkspacePageShell
      description="Member balances and posted ledger evidence are available when the database runtime is active."
      eyebrow="Members"
      title="Member statement"
    >
      <WorkspaceEmptyState
        body="Once the database-backed environment is active, this route will show the printable statement for the selected member."
        title="Member statements need the database runtime."
      />
    </WorkspacePageShell>
  )
}

function StatementSectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <DashboardSectionCard>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-5 w-56 max-w-full" />
      <div className="mt-5 divide-y divide-border border border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex min-h-16 items-center justify-between gap-4 p-3"
            key={index}
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </DashboardSectionCard>
  )
}

export function MemberStatementSkeleton() {
  return (
    <div
      aria-label="Loading member statement"
      className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6 sm:py-10"
      role="status"
    >
      <section className="border border-border bg-background p-4 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-48 max-w-full" />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 md:ml-auto md:max-w-sm">
          <Skeleton className="h-11 md:h-9" />
          <Skeleton className="h-11 md:h-9" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="min-h-24 border border-border p-4" key={index}>
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="mt-4 h-7 w-20 max-w-full" />
          </div>
        ))}
      </section>

      <StatementSectionSkeleton />
      <StatementSectionSkeleton />
      <StatementSectionSkeleton rows={3} />
    </div>
  )
}
