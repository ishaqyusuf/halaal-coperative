import { WorkspacePageShell } from "@/components/dashboard"
import {
  MemberProjectFinancingRequestsView,
  ProjectFinancingRequestsView,
} from "@/components/project-financing-requests-view"
import {
  isRequestPageBlocked,
  RequestPageState,
} from "@/components/requests/request-page-state"
import type { loadProjectFinancingPageData } from "@/lib/project-financing/load-project-financing-page"
import type { TableSettings } from "@/utils/table-settings"

type ProjectFinancingPageData = Awaited<
  ReturnType<typeof loadProjectFinancingPageData>
>

export function ProjectFinancingPageView({
  data,
  projectFinancingInitialSettings,
}: {
  data: ProjectFinancingPageData
  projectFinancingInitialSettings?: Partial<TableSettings>
}) {
  if (isRequestPageBlocked(data.state)) {
    return <RequestPageState state={data.state} title="Project financing" />
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Ask the cooperative to fund your business."
        eyebrow="Project financing"
        title="Project financing"
      >
        <MemberProjectFinancingRequestsView
          canCreate={data.canCreate}
          initialSettings={projectFinancingInitialSettings}
          needsVerification={data.needsVerification}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "staff-ready") return null

  return (
    <WorkspacePageShell
      description="Funding for members' businesses."
      eyebrow="Project financing"
      title="Project financing"
    >
      <ProjectFinancingRequestsView
        canCreate={data.canCreate}
        canReview={data.canReview}
        hasMembers={data.hasMembers}
        initialSettings={projectFinancingInitialSettings}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
