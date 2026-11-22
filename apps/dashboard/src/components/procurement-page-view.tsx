import { serviceLoadErrorGate } from "@halaalvest/utils/service-request-gate"
import { Package } from "lucide-react"
import { WorkspacePageShell } from "@/components/dashboard"
import { ServiceStateCard } from "@/components/requests/service-state-card"
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
  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        description=""
        eyebrow="Procurement"
        title="Procurement"
      >
        <ServiceStateCard
          gate={serviceLoadErrorGate({ noun: "request", title: "Procurement" })}
          serviceIcon={Package}
        />
      </WorkspacePageShell>
    )
  }

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
          active={data.active}
          canCreate={data.canCreate}
          gate={data.gate}
          initialSettings={procurementInitialSettings}
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
