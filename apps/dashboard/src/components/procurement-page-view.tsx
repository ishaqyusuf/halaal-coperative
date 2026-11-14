import { WorkspacePageShell } from "@/components/dashboard"
import {
  MemberProcurementRequestsView,
  ProcurementRequestsView,
} from "@/components/procurement-requests-view"
import {
  isRequestPageBlocked,
  RequestPageState,
} from "@/components/requests/request-page-state"
import type { loadProcurementPageData } from "@/lib/procurement/load-procurement-page"
import type { TableSettings } from "@/utils/table-settings"

type ProcurementPageData = Awaited<ReturnType<typeof loadProcurementPageData>>

export function ProcurementPageView({
  data,
  procurementInitialSettings,
}: {
  data: ProcurementPageData
  procurementInitialSettings?: Partial<TableSettings>
}) {
  if (isRequestPageBlocked(data.state)) {
    return <RequestPageState state={data.state} title="Procurement" />
  }

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        description="Ask the cooperative to buy an item. Pay it back monthly."
        eyebrow="Procurement"
        title="Procurement"
      >
        <MemberProcurementRequestsView
          canCreate={data.canCreate}
          initialSettings={procurementInitialSettings}
          needsVerification={data.needsVerification}
          summary={data.summary}
        />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "staff-ready") return null

  return (
    <WorkspacePageShell
      description="Items the cooperative buys for members, paid back monthly."
      eyebrow="Procurement"
      title="Procurement"
    >
      <ProcurementRequestsView
        canCreate={data.canCreate}
        canReview={data.canReview}
        hasMembers={data.hasMembers}
        initialSettings={procurementInitialSettings}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
