import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberSharesView } from "@/components/member-shares-view"
import { StaffShareRequestsView } from "@/components/staff-share-requests-view"
import type { SharesPageData } from "@/lib/shares/load-shares-page"

const emptyStates = {
  "member-profile-missing": {
    body: "Ask the office to link your account to your membership.",
    title: "Your membership is not linked yet.",
  },
  restricted: {
    body: "Ask a finance officer or administrator.",
    title: "Shares are handled by finance staff.",
  },
  unavailable: {
    body: "Shares show here once the cooperative's data is connected.",
    title: "Shares are not available yet.",
  },
} as const

export function SharesPageView({ data }: { data: SharesPageData }) {
  if (data.state === "member") {
    return (
      <WorkspacePageShell
        description="What you own and what you asked for."
        eyebrow="Shares"
        title="Shares"
      >
        <MemberSharesView
          policy={data.policy}
          requestBlocked={data.requestBlocked}
          requests={data.requests}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "staff") {
    return (
      <WorkspacePageShell
        description="Share requests and share capital."
        eyebrow="Shares"
        title="Shares"
      >
        <StaffShareRequestsView
          pendingCount={data.summary.pendingCount}
          policy={data.policy}
          shareCapital={data.summary.shareCapital}
        />
      </WorkspacePageShell>
    )
  }

  const empty = emptyStates[data.state]

  return (
    <WorkspacePageShell description="" eyebrow="Shares" title="Shares">
      <WorkspaceEmptyState body={empty.body} title={empty.title} />
    </WorkspacePageShell>
  )
}
