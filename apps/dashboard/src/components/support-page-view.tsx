import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  MemberSupportCasesView,
  SupportCasesView,
} from "@/components/support-cases-view"
import type { loadSupportPageData } from "@/lib/support/load-support-page"
import type { TableSettings } from "@/utils/table-settings"

type SupportPageData = Awaited<ReturnType<typeof loadSupportPageData>>

export function SupportPageView({
  data,
  supportInitialSettings,
}: {
  data: SupportPageData
  supportInitialSettings?: Partial<TableSettings>
}) {
  if (data.state === "restricted") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Track member service issues, feature requests, and resolution " +
          "history."
        }
      >
        <WorkspaceEmptyState
          body="Support case management is available to cooperative staff."
          title="Support access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Track member service issues, feature requests, and resolution " +
          "history."
        }
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show support cases, replies, assignments, and resolution notes."
          title="Support cases need the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-sign-in-required") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Open support or feature requests and track replies from " +
          "cooperative staff."
        }
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to open and track support cases."
          title="Member sign-in required."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Open support or feature requests and track replies from staff."
        }
      >
        <WorkspaceEmptyState
          body="Your user account is not linked to a member profile in this cooperative."
          title="Member profile not linked."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="My support cases"
        description={
          "Open support or feature requests and track replies from cooperative " +
          "staff."
        }
      >
        <MemberSupportCasesView
          cases={data.cases}
          initialCase={data.initialCase}
          initialSettings={supportInitialSettings}
          member={data.member}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      eyebrow="Support"
      title="Member support"
      description={
        "Document member issues, feature requests, replies, assignments, and " +
        "resolution evidence without changing posted financial records."
      }
    >
      <SupportCasesView
        assignees={data.assignees}
        canReviewFinancialAdjustments={data.canReviewFinancialAdjustments}
        cases={data.cases}
        initialSettings={supportInitialSettings}
        memberOptions={data.memberOptions}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
