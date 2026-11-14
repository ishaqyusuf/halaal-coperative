import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { PlainListSkeleton } from "@/components/plain-list-skeleton"
import { SummaryCardSkeleton } from "@/components/summary-card"

export function BusinessUnavailableView({
  accessDenied,
}: {
  accessDenied: boolean
}) {
  return (
    <WorkspacePageShell description="" eyebrow="Business" title="Business">
      <WorkspaceEmptyState
        body={
          accessDenied
            ? "Ask a cooperative admin if you need it."
            : "Please try again later."
        }
        title={
          accessDenied
            ? "You can't open this page."
            : "This page isn't available right now."
        }
      />
    </WorkspacePageShell>
  )
}

export function BusinessPageSkeleton() {
  return (
    <WorkspacePageShell description="" eyebrow="Business" title="Business">
      <div aria-label="Loading" className="grid gap-6" role="status">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
        <PlainListSkeleton />
      </div>
    </WorkspacePageShell>
  )
}
