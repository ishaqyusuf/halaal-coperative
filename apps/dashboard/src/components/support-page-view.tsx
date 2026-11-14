import { WorkspacePageShell } from "@/components/dashboard"
import {
  isRequestPageBlocked,
  RequestPageState,
} from "@/components/requests/request-page-state"
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
  if (isRequestPageBlocked(data.state)) {
    return <RequestPageState state={data.state} title="Support" />
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Ask the cooperative office a question. Answers appear here."
        eyebrow="Support"
        title="Support"
      >
        <MemberSupportCasesView
          canCreateSupportCases={data.canCreateSupportCases}
          initialCase={data.initialCase}
          initialSettings={supportInitialSettings}
        />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "staff-ready") return null

  return (
    <WorkspacePageShell
      description="Questions and problems from members."
      eyebrow="Support"
      title="Support"
    >
      <SupportCasesView
        assignees={data.assignees}
        canCreateSupportCases={data.canCreateSupportCases}
        canReviewFinancialAdjustments={data.canReviewFinancialAdjustments}
        initialSettings={supportInitialSettings}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
